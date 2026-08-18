import mongoose from 'mongoose';

const fraudAlertSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
  },
  transactionRef: {
    type: String,
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  orderRef: String,
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerEmail: String,
  amount: {
    type: Number,
    required: true,
  },
  riskScore: {
    type: Number,
    required: true,
    min: [0],
    max: [100],
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  factors: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['new', 'under-review', 'approved', 'rejected', 'resolved'],
    default: 'new',
  },
  decision: {
    type: String,
    enum: [null, 'approve', 'reject', 'flag'],
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  notes: String,
  timeline: [{
    action: String,
    by: mongoose.Schema.Types.ObjectId,
    at: {
      type: Date,
      default: Date.now,
    },
    note: String,
  }],
}, {
  timestamps: true,
});

// Indexes
fraudAlertSchema.index({ status: 1, createdAt: -1 });
fraudAlertSchema.index({ riskLevel: 1 });
fraudAlertSchema.index({ customerId: 1 });
fraudAlertSchema.index({ transactionRef: 1 });

// Add timeline entry on status change
fraudAlertSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.timeline.push({
      action: `Status changed to ${this.status}`,
      by: this.reviewedBy,
      note: this.notes,
    });
  }
  next();
});

const FraudAlert = mongoose.model('FraudAlert', fraudAlertSchema);

export default FraudAlert;
