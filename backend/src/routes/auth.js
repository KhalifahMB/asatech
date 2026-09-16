import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
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

// Profile
router.patch('/me', protect, updateProfile);

// Address book
router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, addAddress);
router.patch('/addresses/:addressId', protect, updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);
router.post('/addresses/:addressId/default', protect, setDefaultAddress);

export default router;
