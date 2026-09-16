import express from 'express';
import {
  getTransactions,
  getTransaction,
  getAllTransactions,
} from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Admin routes (must be declared before /:ref)
router.get('/admin/all', protect, authorize('admin'), getAllTransactions);

// Customer routes
router.get('/', protect, getTransactions);
router.get('/:ref', protect, getTransaction);

export default router;