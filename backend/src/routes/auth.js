import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  requestPasswordReset,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { audit } from '../middleware/audit.js';

const router = express.Router();

router.post('/register', authLimiter, audit('User registration', 'User'), register);
router.post('/login', authLimiter, audit('User login', 'User'), login);
router.post('/logout', protect, audit('User logout', 'User'), logout);
router.get('/me', protect, getMe);
router.post('/password/reset-request', authLimiter, requestPasswordReset);
router.post('/password/reset', authLimiter, resetPassword);

export default router;
