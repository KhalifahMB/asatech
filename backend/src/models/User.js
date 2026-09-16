import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import validator from 'validator';
import config from '../config/index.js';

const OTP_TTL_MINUTES = {
  verification: 10,
  reset: 15,
};

/**
 * Hash an OTP using HMAC-SHA256 keyed by the JWT secret.
 * OTPs are low-entropy 6-digit codes, so a keyed hash prevents offline
 * brute-force by anyone who gains read access to the database.
 */
function hashOtp(otp) {
  if (!config.jwtSecret) return otp;
  return crypto.createHmac('sha256', config.jwtSecret).update(String(otp)).digest('hex');
}

/**
 * Constant-time comparison of two hex digests.
 */
function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: (v) => !v || validator.isMobilePhone(String(v), 'any', { strictMode: false }),
      message: 'Please provide a valid phone number',
    },
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'flagged'],
    default: 'active',
  },
  addresses: [{
    label: {
      type: String,
      default: 'Home',
    },
    name: {
      type: String,
      required: [true, 'Recipient name is required'],
      trim: true,
    },
    line1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true,
    },
    line2: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    default: {
      type: Boolean,
      default: false,
    },
  }],
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verificationOtp: {
    type: String,
    select: false,
  },
  verificationOtpExpires: {
    type: Date,
    select: false,
  },
  passwordResetOtp: {
    type: String,
    select: false,
  },
  passwordChangedAt: Date,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: Date,
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.verificationOtp;
      delete ret.verificationOtpExpires;
      delete ret.passwordResetOtp;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
userSchema.index({ role: 1, status: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // Small offset to ensure JWT is issued after
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(jwtIssuedAt) {
  if (this.passwordChangedAt) {
    const changedTs = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return jwtIssuedAt < changedTs;
  }
  return false;
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

// Reset login attempts after successful login
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });
};

// OTP generation & verification helpers ────────────────────────────────────────

/**
 * Generate a 6-digit email verification OTP.
 * Stores the HMAC hash in `verificationOtp` with a 10-minute TTL.
 * @returns {string} The plain-text OTP to deliver via email.
 */
userSchema.methods.generateVerificationOtp = function () {
  const otp = crypto.randomInt(100000, 1000000).toString();
  this.verificationOtp = hashOtp(otp);
  this.verificationOtpExpires = Date.now() + OTP_TTL_MINUTES.verification * 60 * 1000;
  return otp;
};

/**
 * Verify the email verification OTP.
 * @param {string} candidate — plain-text OTP supplied by the user.
 * @returns {{ valid: boolean, reason?: string }}
 */
userSchema.methods.verifyEmailOtp = function (candidate) {
  if (!this.verificationOtp || !this.verificationOtpExpires) {
    return { valid: false, reason: 'no_otp_sent' };
  }
  if (Date.now() > this.verificationOtpExpires.getTime()) {
    return { valid: false, reason: 'expired' };
  }
  const stored = hashOtp(candidate);
  if (!safeEqual(stored, this.verificationOtp)) {
    return { valid: false, reason: 'invalid' };
  }
  this.emailVerified = true;
  this.verificationOtp = undefined;
  this.verificationOtpExpires = undefined;
  return { valid: true };
};

/**
 * Generate a 6-digit password-reset OTP.
 * @returns {string} Plain-text OTP.
 */
userSchema.methods.generateResetOtp = function () {
  const otp = crypto.randomInt(100000, 1000000).toString();
  this.passwordResetOtp = hashOtp(otp);
  this.passwordResetExpires = Date.now() + OTP_TTL_MINUTES.reset * 60 * 1000;
  return otp;
};

/**
 * Verify password-reset OTP.
 * @param {string} candidate
 * @returns {{ valid: boolean, reason?: string }}
 */
userSchema.methods.verifyResetOtp = function (candidate) {
  if (!this.passwordResetOtp || !this.passwordResetExpires) {
    return { valid: false, reason: 'no_otp_sent' };
  }
  if (Date.now() > this.passwordResetExpires.getTime()) {
    return { valid: false, reason: 'expired' };
  }
  const stored = hashOtp(candidate);
  if (!safeEqual(stored, this.passwordResetOtp)) {
    return { valid: false, reason: 'invalid' };
  }
  this.passwordResetOtp = undefined;
  this.passwordResetExpires = undefined;
  return { valid: true };
};

const User = mongoose.model('User', userSchema);

export default User;
