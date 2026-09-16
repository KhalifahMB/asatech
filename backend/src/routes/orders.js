import express from 'express';
import {
  getOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  resendOrderEmail,
  deleteOrder,
  updateOrderAddress,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

const router = express.Router();

router.use(protect);

// Admin routes (must be declared before /:id)
router.get('/admin/all', authorize('admin'), getAllOrders);
router.patch(
  '/admin/:id/status',
  authorize('admin'),
  audit('Order status updated', 'Order'),
  updateOrderStatus
);
router.post(
  '/admin/:id/send-email',
  authorize('admin'),
  audit('Order email sent', 'Order'),
  resendOrderEmail
);
router.delete(
  '/admin/:id',
  authorize('admin'),
  audit('Order deleted', 'Order'),
  deleteOrder
);

// Customer routes
router.get('/', getOrders);
router.get('/:id', getOrder);
router.patch(
  '/:id/address',
  audit('Order address updated', 'Order'),
  updateOrderAddress
);

export default router;
