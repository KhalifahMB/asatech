import express from 'express';
import {
  getTransactions,
  getTransaction,
  getAllTransactions,
} from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Customer routes
router.get('/', protect, getTransactions);
router.get('/:ref', protect, getTransaction);

// Admin routes
router.use('/admin', protect, authorize('admin'));
router.get('/admin', getAllTransactions);

export default router;
