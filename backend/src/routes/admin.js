import express from 'express';
import {
  getCustomers,
  getCustomer,
  getAuditLogs,
  getAnalytics,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

const router = express.Router();

// All admin routes require admin access
router.use(protect, authorize('admin'));

router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomer);
router.get('/audit-logs', audit('Audit log access', 'AuditLog'), getAuditLogs);
router.get('/analytics', getAnalytics);

export default router;
