import Product from '../models/Product.js';
import ErrorResponse from '../utils/errorResponse.js';

const ALLOWED_SORTS = new Set([
  'featured',
  'price-asc',
  'price-desc',
  'rating',
  'newest',
  'deals',
]);

/**
 * @desc    List products with filtering, sorting and pagination
 * @route   GET /api/v1/products
 * @access  Public
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      sort: sortInput,
    } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const sort = ALLOWED_SORTS.has(sortInput) ? sortInput : 'featured';

    const query = { status: { $ne: 'inactive' } };

    if (category && category !== 'all') {
      query.category = category;
    }

    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      query.price = {};
      if (!Number.isNaN(min)) query.price.$gte = min;
      if (!Number.isNaN(max)) query.price.$lte = max;
    }

    if (inStock === 'true' || inStock === true) {
      query.stock = { $gt: 0 };
    }

    if (search && typeof search === 'string') {
      // Escape regex metacharacters to prevent ReDoS
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { short: { $regex: safe, $options: 'i' } },
      ];
    }

    let sortOption;
    switch (sort) {
      case 'price-asc': sortOption = { price: 1 }; break;
      case 'price-desc': sortOption = { price: -1 }; break;
      case 'rating': sortOption = { rating: -1, ratingCount: -1 }; break;
      case 'newest': sortOption = { createdAt: -1 }; break;
      case 'deals': sortOption = { previousPrice: -1 }; break;
      case 'featured':
      default: sortOption = { featured: -1, rating: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOption).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get featured products
 * @route   GET /api/v1/products/featured
 * @access  Public
 */
export const getFeaturedProducts = async (req, res, next) => {
  try {
    const limit = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const products = await Product.find({
      featured: true,
      status: { $ne: 'inactive' },
    })
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by slug or ID
 * @route   GET /api/v1/products/:slug
 * @access  Public
 */
export const getProduct = async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Only allow ObjectId lookup if slug looks like one
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(slug);
    const query = isObjectId ? { $or: [{ slug }, { _id: slug }] } : { slug };

    const product = await Product.findOne(query).lean();

    if (!product) {
      return next(ErrorResponse.notFound('Product not found'));
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create product (admin)
 * @route   POST /api/v1/admin/products
 * @access  Private/Admin
 */
export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return next(ErrorResponse.conflict('A product with this slug already exists'));
    }
    next(error);
  }
};

/**
 * @desc    Update product (admin)
 * @route   PATCH /api/v1/admin/products/:id
 * @access  Private/Admin
 */
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return next(ErrorResponse.notFound('Product not found'));
    }

    res.json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return next(ErrorResponse.conflict('A product with this slug already exists'));
    }
    next(error);
  }
};

/**
 * @desc    Delete product (admin)
 * @route   DELETE /api/v1/admin/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return next(ErrorResponse.notFound('Product not found'));
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};
