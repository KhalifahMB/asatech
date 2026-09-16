import mongoose from 'mongoose';
import { generateTransactionRef } from '../utils/generateToken.js';

const transactionSchema = new mongoose.Schema({
  reference: {
    type: String,
    unique: true,
    default: generateTransactionRef,
  },
  paystackReference: {
    type: String,
    unique: true,
    sparse: true,
  },
  // Client-generated uuid scoped to a single checkout attempt. Prevents retries
  // from creating duplicate orders / Paystack sessions.
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  gatewayMessage: String,
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  orderRef: {
    type: String,
    required: true,
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
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative'],
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'successful', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
  },
  channel: {
    type: String,
    enum: ['card', 'bank', 'ussd', 'qr', 'mobile'],
  },
  method: {
    type: String,
    default: 'Paystack',
  },
  riskScore: {
    type: Number,
    default: 0,
    min: [0],
    max: [100],
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },
  paystackData: {
    authorization: String,
    card: {
      last4: String,
      brand: String,
      expMonth: String,
      expYear: String,
    },
    bank: String,
  },
  metadata: mongoose.Schema.Types.Mixed,
  verifiedAt: Date,
  paidAt: Date,
}, {
  timestamps: true,
});

// Indexes
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ customerId: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ riskLevel: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
