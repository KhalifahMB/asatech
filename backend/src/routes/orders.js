import express from 'express';
import {
  getOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

const router = express.Router();

router.use(protect);

// Admin routes (must be declared before /:ref)
router.get('/admin/all', authorize('admin'), getAllOrders);
router.patch(
  '/admin/:ref/status',
  authorize('admin'),
  audit('Order status updated', 'Order'),
  updateOrderStatus
);

// Customer routes
router.get('/', getOrders);
router.get('/:ref', getOrder);

export default router;
