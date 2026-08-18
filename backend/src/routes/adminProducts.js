import express from 'express';
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

const router = express.Router();

// All product admin routes require admin access
router.use(protect, authorize('admin'));

router.post('/', audit('Product creation', 'Product'), createProduct);
router.patch('/:id', audit('Product update', 'Product'), updateProduct);
router.delete('/:id', audit('Product deletion', 'Product'), deleteProduct);

export default router;
