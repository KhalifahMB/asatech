import FraudAlert from '../models/FraudAlert.js';
import Transaction from '../models/Transaction.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @desc    Get fraud alerts (admin only)
 * @route   GET /api/v1/fraud/alerts
 * @access  Private/Admin
 */
export const getFraudAlerts = async (req, res, next) => {
  try {
    const { status, severity, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (severity) {
      query.severity = severity;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { transactionRef: { $regex: search, $options: 'i' } },
        { orderRef: { $regex: search, $options: 'i' } },
      ];
    }

    const alerts = await FraudAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit)
      .populate('transactionId', 'reference amount status')
      .populate('orderId', 'ref total')
      .populate('customerId', 'name email');

    const total = await FraudAlert.countDocuments(query);

    res.json({
      success: true,
      count: alerts.length,
      total,
      page: Number(page),
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get fraud alert by ID (admin only)
 * @route   GET /api/v1/fraud/alerts/:id
 * @access  Private/Admin
 */
export const getFraudAlert = async (req, res, next) => {
  try {
    const alert = await FraudAlert.findById(req.params.id)
      .populate('transactionId')
      .populate('orderId')
      .populate('customerId', 'name email phone addresses')
      .populate('reviewedBy', 'name email');

    if (!alert) {
      return next(ErrorResponse.notFound('Fraud alert not found'));
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update fraud alert (admin only)
 * @route   PATCH /api/v1/fraud/alerts/:id
 * @access  Private/Admin
 */
export const updateFraudAlert = async (req, res, next) => {
  try {
    const { status, decision, notes } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (decision) updateData.decision = decision;
    if (notes) updateData.notes = notes;
    updateData.reviewedBy = req.user._id;
    updateData.reviewedAt = new Date();

    const alert = await FraudAlert.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('transactionId');

    if (!alert) {
      return next(ErrorResponse.notFound('Fraud alert not found'));
    }

    // Update transaction/order status based on decision
    if (decision === 'reject' && alert.transactionId) {
      await Transaction.findByIdAndUpdate(alert.transactionId, {
        status: 'cancelled',
      });
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};
