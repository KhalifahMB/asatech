import Transaction from '../models/Transaction.js';
import Order from '../models/Order.js';
import ErrorResponse from '../utils/errorResponse.js';
import { verifyUnsettledTransactions } from '../services/paymentVerification.js';

/**
 * @desc    Get transactions for current user
 * @route   GET /api/v1/transactions
 * @access  Private
 */
export const getTransactions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { customerId: req.user._id };

    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit)
      .populate('orderId', 'ref total');

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      count: transactions.length,
      total,
      page: Number(page),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get transaction by reference
 * @route   GET /api/v1/transactions/:ref
 * @access  Private
 */
export const getTransaction = async (req, res, next) => {
  try {
    const query = {
      $or: [{ reference: req.params.ref }, { _id: req.params.ref }],
    };

    // Customers can only see their own transactions
    if (req.user.role !== 'admin') {
      query.customerId = req.user._id;
    }

    const transaction = await Transaction.findOne(query)
      .populate('orderId')
      .populate('customerId', 'name email');

    if (!transaction) {
      return next(ErrorResponse.notFound('Transaction not found'));
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all transactions (admin only)
 * @route   GET /api/v1/admin/transactions
 * @access  Private/Admin
 */
export const getAllTransactions = async (req, res, next) => {
  try {
    const { status, customerId, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (search) {
      query.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { orderRef: { $regex: search, $options: 'i' } },
      ];
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit)
      .populate('customerId', 'name email')
      .populate('orderId', 'ref total');

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      count: transactions.length,
      total,
      page: Number(page),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reconcile unsettled transactions against Paystack (admin only)
 * @route   POST /api/v1/admin/transactions/sync
 * @access  Private/Admin
 *
 * Finds every transaction still pending/processing and verifies it directly
 * with Paystack, settling or failing it (and its order) atomically. Use after
 * deploying webhook fixes or to clear payments that were confirmed by Paystack
 * but never reconciled (the classic "paid but stuck on pending" case).
 */
export const syncTransactions = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const summary = await verifyUnsettledTransactions({ limit });
    res.json({ success: true, ...summary });
  } catch (error) {
    next(error);
  }
};
