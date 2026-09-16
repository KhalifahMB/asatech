import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { audit } from '../middleware/audit.js';

const router = express.Router();

router.post('/register', authLimiter, audit('User registration', 'User'), register);
router.post('/login', authLimiter, audit('User login', 'User'), login);
router.post('/logout', protect, audit('User logout', 'User'), logout);
router.get('/me', protect, getMe);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
router.post('/password/reset-request', authLimiter, requestPasswordReset);
router.post('/password/reset', authLimiter, resetPassword);
router.post('/password/change', protect, audit('Password changed', 'User'), changePassword);

export default router;
