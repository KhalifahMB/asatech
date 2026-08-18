import express from 'express';
import {
  getProducts,
  getProduct,
  getFeaturedProducts,
} from '../controllers/productController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:slug', getProduct);

export default router;
