import crypto from 'crypto';
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
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(ErrorResponse.conflict('Email already registered'));
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
    });

    // Generate token
    const token = generateToken(user._id);

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
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
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
 * @desc    Request password reset
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
        message: 'If an account exists, a reset link has been sent',
      });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    // Send email
    try {
      await emailService.sendPasswordReset(user.email, resetToken);
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
      message: 'If an account exists, a reset link has been sent',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password with token
 * @route   POST /api/v1/auth/password/reset
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return next(ErrorResponse.badRequest('Token and password are required'));
    }

    // Hash the token to find user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(ErrorResponse.badRequest('Invalid or expired reset token'));
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
