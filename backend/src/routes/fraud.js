import express from 'express';
import {
  getFraudAlerts,
  getFraudAlert,
  updateFraudAlert,
} from '../controllers/fraudController.js';
import { protect, authorize } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

const router = express.Router();

// All fraud routes require admin access
router.use(protect, authorize('admin'));

router.get('/', getFraudAlerts);
router.get('/:id', getFraudAlert);
router.patch('/:id', audit('Fraud alert update', 'FraudAlert'), updateFraudAlert);

export default router;
