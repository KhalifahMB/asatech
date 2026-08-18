import mongoose from 'mongoose';
import { generateOrderRef } from '../utils/generateToken.js';

const orderSchema = new mongoose.Schema({
  ref: {
    type: String,
    unique: true,
    default: generateOrderRef,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerEmail: {
    type: String,
    required: true,
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: String,
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
  }],
  subtotal: {
    type: Number,
    required: true,
  },
  shipping: {
    type: Number,
    default: 2500,
  },
  total: {
    type: Number,
    required: true,
  },
  shippingAddress: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    phone: String,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentRef: String,
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  riskScore: {
    type: Number,
    default: 0,
    min: [0, 'Risk score cannot be negative'],
    max: [100, 'Risk score cannot exceed 100'],
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },
  timeline: [{
    step: {
      type: String,
      enum: ['placed', 'paid', 'processing', 'shipped', 'delivered'],
    },
    at: Date,
    done: {
      type: Boolean,
      default: false,
    },
  }],
  notes: String,
}, {
  timestamps: true,
});

// Indexes
orderSchema.index({ ref: 1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, orderStatus: 1 });
orderSchema.index({ riskLevel: 1 });

// Update timeline on status change
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus')) {
    const stepMap = {
      pending: 'placed',
      processing: 'processing',
      confirmed: 'processing',
      shipped: 'shipped',
      delivered: 'delivered',
    };

    const currentStep = stepMap[this.orderStatus];
    if (currentStep) {
      const existingStep = this.timeline.find(t => t.step === currentStep);
      if (!existingStep) {
        this.timeline.push({
          step: currentStep,
          at: new Date(),
          done: true,
        });
      }
    }
  }

  if (this.isModified('paymentStatus') && this.paymentStatus === 'paid') {
    const paidStep = this.timeline.find(t => t.step === 'paid');
    if (!paidStep) {
      this.timeline.push({
        step: 'paid',
        at: new Date(),
        done: true,
      });
    }
  }

  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
