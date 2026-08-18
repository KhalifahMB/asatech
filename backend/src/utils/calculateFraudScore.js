import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Fraud detection service - Rules-based scoring system
 * 
 * Risk Levels:
 * - Low: 0-29
 * - Medium: 30-59
 * - High: 60-100
 */

const RISK_FACTORS = {
  HIGH_VALUE: { label: 'High-value purchase', score: 30, threshold: 500000 },
  MULTIPLE_PURCHASES: { label: 'Multiple purchases in short period', score: 25, threshold: 5 },
  NEW_DEVICE: { label: 'New or unrecognized device', score: 20 },
  FAILED_LOGINS: { label: 'Multiple failed login attempts', score: 15, threshold: 3 },
  UNUSUAL_HOURS: { label: 'Unusual purchasing behaviour', score: 10 },
  OTHER_SUSPICIOUS: { label: 'Other suspicious activity', score: 15 },
};

/**
 * Calculate fraud risk score for a transaction
 * @param {Object} options - Fraud calculation options
 * @param {Object} options.user - User object
 * @param {number} options.amount - Transaction amount
 * @param {string} options.deviceId - Device identifier
 * @param {string} options.ipAddress - IP address
 * @returns {Promise<Object>} Fraud assessment result
 */
export const calculateFraudScore = async ({ user, amount, deviceId, ipAddress }) => {
  let score = 0;
  const factors = [];

  // 1. High-value purchase check
  if (amount >= RISK_FACTORS.HIGH_VALUE.threshold) {
    score += RISK_FACTORS.HIGH_VALUE.score;
    factors.push(RISK_FACTORS.HIGH_VALUE.label);
  }

  // 2. Multiple purchases in 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOrders = await Order.countDocuments({
    customerId: user._id,
    createdAt: { $gte: twentyFourHoursAgo },
  });

  if (recentOrders >= RISK_FACTORS.MULTIPLE_PURCHASES.threshold) {
    score += RISK_FACTORS.MULTIPLE_PURCHASES.score;
    factors.push(RISK_FACTORS.MULTIPLE_PURCHASES.label);
  }

  // 3. New device check — only score if a device identifier was supplied and
  // no prior successful login from this device has been recorded.
  if (deviceId) {
    const deviceAudit = await AuditLog.findOne({
      actor: user.email,
      action: 'User login',
      status: 'success',
      'metadata.deviceId': deviceId,
    });

    if (!deviceAudit) {
      score += RISK_FACTORS.NEW_DEVICE.score;
      factors.push(RISK_FACTORS.NEW_DEVICE.label);
    }
  }

  // 4. Failed login attempts in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const failedLogins = await AuditLog.countDocuments({
    actor: user.email,
    action: 'Login failed',
    status: 'failed',
    createdAt: { $gte: oneHourAgo },
  });

  if (failedLogins >= RISK_FACTORS.FAILED_LOGINS.threshold) {
    score += RISK_FACTORS.FAILED_LOGINS.score;
    factors.push(RISK_FACTORS.FAILED_LOGINS.label);
  }

  // 5. Unusual hours (2AM - 5AM)
  const currentHour = new Date().getHours();
  if (currentHour >= 2 && currentHour <= 5) {
    score += RISK_FACTORS.UNUSUAL_HOURS.score;
    factors.push(RISK_FACTORS.UNUSUAL_HOURS.label);
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine risk level
  let riskLevel;
  if (score >= 60) {
    riskLevel = 'high';
  } else if (score >= 30) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    score,
    riskLevel,
    factors,
    timestamp: new Date(),
  };
};

/**
 * Get risk level from score
 * @param {number} score - Risk score (0-100)
 * @returns {string} Risk level
 */
export const getRiskLevel = (score) => {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
};

/**
 * Get all risk factor definitions
 * @returns {Array} Risk factors
 */
export const getRiskFactors = () => {
  return Object.values(RISK_FACTORS).map(f => ({
    label: f.label,
    score: f.score,
    threshold: f.threshold || null,
  }));
};

export default {
  calculateFraudScore,
  getRiskLevel,
  getRiskFactors,
};
