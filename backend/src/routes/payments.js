import express from 'express';
import {
  initializePayment,
  handleWebhook,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
import { paymentLimiter, webhookLimiter } from '../middleware/rateLimiter.js';
import { audit } from '../middleware/audit.js';

const router = express.Router();

// Initialize payment (requires auth)
router.post('/initialize', protect, paymentLimiter, audit('Payment initialization', 'Payment'), initializePayment);

// Webhook (public, but signature verified)
router.post('/webhook', webhookLimiter, handleWebhook);

export default router;
