import express from 'express';
import {
  getCustomers,
  getCustomer,
  getAuditLogs,
  getAnalytics,
  seedDemoData,
} from '../controllers/adminController.js';
import { syncTransactions } from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

const router = express.Router();

// All admin routes require admin access
router.use(protect, authorize('admin'));

router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomer);
router.get('/audit-logs', audit('Audit log access', 'AuditLog'), getAuditLogs);
router.get('/analytics', getAnalytics);
router.post('/transactions/sync', audit('Transactions synced', 'Transaction'), syncTransactions);
router.post('/maintenance/seed-demo', audit('Demo data seeded', 'Maintenance'), seedDemoData);

export default router;
