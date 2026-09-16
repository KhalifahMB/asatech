import express from 'express';
import {
  initializePayment,
  resumePayment,
  handleWebhook,
  verifyPayment,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
import { paymentLimiter, webhookLimiter } from '../middleware/rateLimiter.js';
import { audit } from '../middleware/audit.js';

const router = express.Router();

// Initialize payment (requires auth)
router.post('/initialize', protect, paymentLimiter, audit('Payment initialization', 'Payment'), initializePayment);

// Resume a pending payment session
router.post('/resume', protect, paymentLimiter, audit('Payment resumed', 'Payment'), resumePayment);

// On-demand verification (customer or admin) — reconciles a payment server-side
router.get('/verify/:reference', protect, audit('Payment verification', 'Payment'), verifyPayment);

// Webhook (public, but signature verified)
router.post('/webhook', webhookLimiter, handleWebhook);

export default router;
