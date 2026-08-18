import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  actor: {
    type: String,
    required: true,
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  actorRole: {
    type: String,
    enum: ['customer', 'admin', 'system'],
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  resource: {
    type: String,
    required: true,
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success',
  },
  detail: String,
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
}, {
  timestamps: true,
});

// Indexes for efficient querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actor: 1, timestamp: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resource: 1 });
auditLogSchema.index({ status: 1 });

// TTL index for automatic cleanup (optional - 2 years)
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
