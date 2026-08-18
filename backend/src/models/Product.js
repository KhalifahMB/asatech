import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [200, 'Name cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'smartphones',
      'laptops',
      'tablets',
      'smartwatches',
      'headphones',
      'chargers',
      'other',
    ],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  previousPrice: {
    type: Number,
    min: [0, 'Previous price cannot be negative'],
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock cannot be negative'],
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
  },
  ratingCount: {
    type: Number,
    default: 0,
    min: [0],
  },
  badge: {
    type: String,
    enum: [null, 'New', 'Best Seller', 'Deal', 'Featured'],
    default: null,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  images: [{
    type: String,
    required: true,
  }],
  short: {
    type: String,
    maxlength: [300, 'Short description cannot exceed 300 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  specs: [{
    label: String,
    value: String,
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'out-of-stock'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
productSchema.index({ slug: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Virtual for discount percentage
productSchema.virtual('discountPercent').get(function() {
  if (!this.previousPrice || this.previousPrice <= 0) return 0;
  return Math.round((1 - this.price / this.previousPrice) * 100);
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock <= 0) return 'out-of-stock';
  if (this.stock <= 10) return 'low-stock';
  return 'in-stock';
});

// Update status based on stock
productSchema.pre('save', function(next) {
  if (this.stock <= 0) {
    this.status = 'out-of-stock';
  } else if (this.status === 'out-of-stock') {
    this.status = 'active';
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;
