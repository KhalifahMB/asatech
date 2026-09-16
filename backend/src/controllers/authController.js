import User from '../models/User.js';
import Order from '../models/Order.js';
import { generateToken } from '../utils/generateToken.js';
import ErrorResponse from '../utils/errorResponse.js';
import emailService from '../utils/email.js';
import { auditLogger } from '../utils/logger.js';

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 *
 * A user is NOT considered active until their email is verified. We generate an
 * OTP, email it, and return without issuing a session token so the frontend can
 * route the user to the verification screen.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(ErrorResponse.conflict('Email already registered'));
    }

    // Create user (emailVerified defaults to false)
    const user = await User.create({
      name,
      email,
      password,
      phone,
    });

    // Generate & send verification OTP (best-effort; user can resend)
    const otp = user.generateVerificationOtp();
    await user.save({ validateBeforeSave: false });

    let emailDelivered = false;
    try {
      await emailService.sendVerificationOtp(user, otp);
      emailDelivered = true;
    } catch (emailError) {
      auditLogger.error('Verification OTP email failed', {
        actor: email,
        action: 'register',
        error: emailError.message,
      });
      // Do not block registration — the user can request a resend
    }

    // Audit log
    auditLogger.info('User registered', {
      actor: email,
      action: 'register',
      resource: 'User',
      status: 'success',
    });

    res.status(201).json({
      success: true,
      data: {
        requiresVerification: true,
        email: user.email,
        emailDelivered,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify a user's email with the OTP sent at registration
 * @route   POST /api/v1/auth/verify-email
 * @access  Public
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return next(ErrorResponse.badRequest('Email and verification code are required'));
    }

    const user = await User.findOne({ email }).select('+verificationOtp +verificationOtpExpires');
    if (!user) {
      return next(ErrorResponse.badRequest('Invalid or expired verification code', 'INVALID_OTP'));
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        data: { emailVerified: true, message: 'Email already verified' },
      });
    }

    const result = user.verifyEmailOtp(otp);
    if (!result.valid) {
      auditLogger.warn('Email verification failed', {
        actor: email,
        action: 'verify_email',
        resource: 'User',
        status: 'failed',
        reason: result.reason,
      });

      if (result.reason === 'expired') {
        return next(ErrorResponse.badRequest('Verification code has expired. Please request a new one.', 'OTP_EXPIRED'));
      }
      return next(ErrorResponse.badRequest('Invalid verification code', 'INVALID_OTP'));
    }

    await user.save({ validateBeforeSave: false });

    auditLogger.info('Email verified', {
      actor: email,
      action: 'verify_email',
      resource: 'User',
      status: 'success',
    });

    res.json({
      success: true,
      data: { emailVerified: true },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend the email verification OTP
 * @route   POST /api/v1/auth/resend-verification
 * @access  Public
 */
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(ErrorResponse.badRequest('Email is required'));
    }

    const user = await User.findOne({ email });

    // Anti-enumeration: always return a generic success message
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, a verification code has been sent',
      });
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        data: { emailVerified: true },
      });
    }

    const otp = user.generateVerificationOtp();
    await user.save({ validateBeforeSave: false });

    let emailDelivered = false;
    try {
      await emailService.sendVerificationOtp(user, otp);
      emailDelivered = true;
    } catch (emailError) {
      auditLogger.error('Verification OTP resend failed', {
        actor: email,
        action: 'resend_verification',
        error: emailError.message,
      });
    }

    res.json({
      success: true,
      message: 'If an account exists, a verification code has been sent',
      data: { emailDelivered },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return next(ErrorResponse.badRequest('Please provide email and password'));
    }

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      auditLogger.warn('Login failed - user not found', {
        actor: email,
        action: 'login',
        resource: 'User',
        status: 'failed',
      });
      return next(ErrorResponse.unauthorized('Invalid credentials'));
    }

    // Check if account is locked
    if (user.isLocked()) {
      auditLogger.warn('Login attempt on locked account', {
        actor: email,
        action: 'login',
        resource: 'User',
        status: 'failed',
      });
      return next(ErrorResponse.forbidden('Account is locked. Please reset your password.'));
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incLoginAttempts();
      
      auditLogger.warn('Login failed - invalid password', {
        actor: email,
        action: 'login',
        resource: 'User',
        status: 'failed',
      });
      return next(ErrorResponse.unauthorized('Invalid credentials'));
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    // Strict enforcement: customer accounts must verify their email before
    // they can sign in. Admins (seeded/direct-created) are trusted.
    if (user.role !== 'admin' && user.emailVerified === false) {
      auditLogger.warn('Login blocked - email not verified', {
        actor: email,
        action: 'login',
        resource: 'User',
        status: 'failed',
      });
      return next(
        ErrorResponse.forbidden(
          'Please verify your email address before signing in. A verification code has not been sent yet — request a new one.',
          'EMAIL_NOT_VERIFIED'
        )
      );
    }

    // Generate token
    const token = generateToken(user._id);

    // Audit log
    auditLogger.info('User logged in', {
      actor: email,
      action: 'login',
      resource: 'User',
      status: 'success',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    auditLogger.info('User logged out', {
      actor: req.user.email,
      action: 'logout',
      resource: 'User',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update profile name / phone
 * @route   PATCH /api/v1/auth/me
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim() || undefined;

    if (Object.keys(updates).length === 0) {
      return next(ErrorResponse.badRequest('No valid fields to update'));
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return next(ErrorResponse.notFound('User not found'));
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

const MAX_ADDRESSES = 20;

/**
 * @desc    List saved addresses
 * @route   GET /api/v1/auth/addresses
 * @access  Private
 */
export const getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    res.json({ success: true, data: user?.addresses || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a new address
 * @route   POST /api/v1/auth/addresses
 * @access  Private
 */
export const addAddress = async (req, res, next) => {
  try {
    const { label, name, line1, line2, city, state, phone, default: isDefault } = req.body;

    if (!name || !line1 || !city || !state || !phone) {
      return next(ErrorResponse.badRequest('Name, address, city, state, and phone are required'));
    }

    const user = await User.findById(req.user._id);
    if (!user) return next(ErrorResponse.notFound('User not found'));

    if (user.addresses.length >= MAX_ADDRESSES) {
      return next(ErrorResponse.badRequest(`Maximum of ${MAX_ADDRESSES} addresses reached`));
    }

    // If this is the first address, force it to be the default
    const makeDefault = isDefault || user.addresses.length === 0;

    if (makeDefault) {
      user.addresses.forEach((a) => { a.default = false; });
    }

    user.addresses.push({
      label: (label || '').trim() || 'Home',
      name: name.trim(),
      line1: line1.trim(),
      line2: (line2 || '').trim(),
      city: city.trim(),
      state: state.trim(),
      phone: phone.trim(),
      default: makeDefault,
    });

    await user.save({ validateBeforeSave: true });

    res.status(201).json({ success: true, data: user.addresses });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an address
 * @route   PATCH /api/v1/auth/addresses/:addressId
 * @access  Private
 */
export const updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(ErrorResponse.notFound('User not found'));

    const addr = user.addresses.id(req.params.addressId);
    if (!addr) return next(ErrorResponse.notFound('Address not found'));

    const { label, name, line1, line2, city, state, phone, default: isDefault } = req.body;
    if (label !== undefined) addr.label = (label || '').trim() || 'Home';
    if (name !== undefined) addr.name = name.trim();
    if (line1 !== undefined) addr.line1 = line1.trim();
    if (line2 !== undefined) addr.line2 = (line2 || '').trim();
    if (city !== undefined) addr.city = city.trim();
    if (state !== undefined) addr.state = state.trim();
    if (phone !== undefined) addr.phone = phone.trim();
    if (isDefault === true) {
      user.addresses.forEach((a) => { a.default = false; });
      addr.default = true;
    }

    await user.save({ validateBeforeSave: true });

    res.json({ success: true, data: user.addresses });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an address
 * @route   DELETE /api/v1/auth/addresses/:addressId
 * @access  Private
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(ErrorResponse.notFound('User not found'));

    const addr = user.addresses.id(req.params.addressId);
    if (!addr) return next(ErrorResponse.notFound('Address not found'));

    addr.deleteOne();
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, data: user.addresses });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set an address as the default
 * @route   POST /api/v1/auth/addresses/:addressId/default
 * @access  Private
 */
export const setDefaultAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(ErrorResponse.notFound('User not found'));

    const addr = user.addresses.id(req.params.addressId);
    if (!addr) return next(ErrorResponse.notFound('Address not found'));

    user.addresses.forEach((a) => { a.default = false; });
    addr.default = true;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, data: user.addresses });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // Get order count and total spent
    const orderStats = await Order.aggregate([
      { $match: { customerId: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          status: user.status,
          emailVerified: user.emailVerified,
          addresses: user.addresses,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
        stats: orderStats[0] || { totalOrders: 0, totalSpent: 0 },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request password reset — emails a 6-digit OTP
 * @route   POST /api/v1/auth/password/reset-request
 * @access  Public
 */
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(ErrorResponse.badRequest('Email is required'));
    }

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, a password reset code has been sent',
      });
    }

    // Generate reset OTP
    const otp = user.generateResetOtp();
    await user.save({ validateBeforeSave: false });

    // Send email
    try {
      await emailService.sendPasswordReset(user, otp);
    } catch (emailError) {
      auditLogger.error('Password reset email failed', {
        actor: email,
        action: 'password_reset_request',
        error: emailError.message,
      });
      // Continue anyway - don't expose email failure to user
    }

    auditLogger.info('Password reset requested', {
      actor: email,
      action: 'password_reset_request',
      resource: 'User',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'If an account exists, a password reset code has been sent',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password with OTP + new password
 * @route   POST /api/v1/auth/password/reset
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return next(ErrorResponse.badRequest('Email, code and new password are required'));
    }

    const user = await User.findOne({ email }).select('+passwordResetOtp +passwordResetExpires');

    if (!user) {
      return next(ErrorResponse.badRequest('Invalid or expired reset code', 'INVALID_OTP'));
    }

    const result = user.verifyResetOtp(otp);
    if (!result.valid) {
      auditLogger.warn('Password reset failed - invalid OTP', {
        actor: email,
        action: 'password_reset',
        resource: 'User',
        status: 'failed',
        reason: result.reason,
      });

      if (result.reason === 'expired') {
        return next(
          ErrorResponse.badRequest('Reset code has expired. Please request a new one.', 'OTP_EXPIRED')
        );
      }
      return next(ErrorResponse.badRequest('Invalid reset code', 'INVALID_OTP'));
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    auditLogger.info('Password reset completed', {
      actor: user.email,
      action: 'password_reset',
      resource: 'User',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password for an authenticated user
 * @route   POST /api/v1/auth/password/change
 * @access  Private
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(ErrorResponse.badRequest('Current and new password are required'));
    }

    if (newPassword.length < 8) {
      return next(ErrorResponse.badRequest('New password must be at least 8 characters'));
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return next(ErrorResponse.notFound('User not found'));
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      auditLogger.warn('Password change failed - current password incorrect', {
        actor: user.email,
        action: 'change_password',
        resource: 'User',
        status: 'failed',
      });
      return next(ErrorResponse.badRequest('Current password is incorrect', 'INVALID_PASSWORD'));
    }

    user.password = newPassword;
    await user.save();

    auditLogger.info('Password changed', {
      actor: user.email,
      action: 'change_password',
      resource: 'User',
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
