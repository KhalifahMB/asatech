import { auditLogger } from '../utils/logger.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Audit logging middleware
 * Logs important actions for security and compliance
 */
export const audit = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json to capture response
    res.json = function(data) {
      // Log after response is sent
      setImmediate(async () => {
        try {
          await AuditLog.create({
            actor: req.user?.email || 'anonymous',
            actorId: req.user?._id,
            actorRole: req.user?.role || 'customer',
            action,
            resource,
            resourceId: req.params.id || null,
            status: res.statusCode >= 400 ? 'failed' : 'success',
            detail: typeof data === 'object' ? JSON.stringify(data).substring(0, 500) : null,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
        } catch (error) {
          auditLogger.error('Audit log creation failed', { error: error.message });
        }
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Quick audit log helper for manual logging
 */
export const logAudit = async (options) => {
  try {
    await AuditLog.create(options);
  } catch (error) {
    auditLogger.error('Manual audit log failed', { error: error.message });
  }
};

export default { audit, logAudit };
