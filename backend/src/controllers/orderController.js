import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import FraudAlert from '../models/FraudAlert.js';
import ErrorResponse from '../utils/errorResponse.js';
import emailService from '../utils/email.js';
import { auditLogger } from '../utils/logger.js';

/**
 * Build an order lookup filter that accepts either the human-readable
 * reference (e.g. AST-XXXXXX) or the Mongo _id. Order references never look
 * like an ObjectId, so a valid ObjectId means the caller passed an _id.
 */
function orderParamQuery(param) {
  const isObjectId = mongoose.Types.ObjectId.isValid(param);
  return isObjectId ? { $or: [{ _id: param }, { ref: param }] } : { ref: param };
}

/**
 * @desc    Get user orders
 * @route   GET /api/v1/orders
 * @access  Private
 */
export const getOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { customerId: req.user._id };

    if (status) {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('items.productId', 'name image price')
      .limit(Number(limit))
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order by reference or _id
 * @route   GET /api/v1/orders/:id
 * @access  Private
 */
export const getOrder = async (req, res, next) => {
  try {
    const query = orderParamQuery(req.params.id);

    // Customers can only see their own orders
    if (req.user.role !== 'admin') {
      query.customerId = req.user._id;
    }

    const order = await Order.findOne(query)
      .populate('items.productId', 'name image price category')
      .populate('transactionId');

    if (!order) {
      return next(ErrorResponse.notFound('Order not found'));
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all orders (admin only)
 * @route   GET /api/v1/admin/orders
 * @access  Private/Admin
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const { status, customerId, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) {
      query.orderStatus = status;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (search) {
      query.$or = [
        { ref: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit)
      .populate('customerId', 'name email');

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Allowed order-status transitions keyed by payment status. Every key is the
 * current orderStatus; the value is the set of statuses that may follow.
 * - Paid orders may only advance forward (processing → shipped → delivered).
 * - Unpaid orders may move through earlier stages or be cancelled.
 */
const STATUS_TRANSITIONS = {
  pending: {
    unpaid: ['processing', 'confirmed', 'cancelled'],
    paid:   ['processing'],
  },
  processing: {
    unpaid: ['confirmed', 'cancelled'],
    paid:   ['shipped', 'delivered'],
  },
  confirmed: {
    unpaid: ['processing', 'cancelled'],
    paid:   ['shipped', 'delivered'],
  },
  shipped: {
    unpaid: ['delivered'],
    paid:   ['delivered'],
  },
  delivered: {},
  cancelled: {},
};

/**
 * @desc    Update order status (admin only)
 * @route   PATCH /api/v1/admin/orders/:id/status
 * @access  Private/Admin
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return next(ErrorResponse.badRequest('Status is required'));
    }

    const order = await Order.findOne(orderParamQuery(req.params.id));

    if (!order) {
      return next(ErrorResponse.notFound('Order not found'));
    }

    // Determine which bucket of transitions applies
    const isPaid = order.paymentStatus === 'paid';
    const allowed = STATUS_TRANSITIONS[order.orderStatus]?.[isPaid ? 'paid' : 'unpaid'] || [];

    if (!allowed.includes(status)) {
      return next(
        ErrorResponse.badRequest(
          `Cannot move order from "${order.orderStatus}" to "${status}" ` +
          `(${isPaid ? 'paid' : 'unpaid'} orders may only transition to: ${allowed.join(', ') || 'no further status changes'})`,
        ),
      );
    }

    order.orderStatus = status;
    await order.save();

    // Send delivery notification emails on relevant status transitions
    if (['shipped', 'delivered'].includes(status)) {
      setImmediate(async () => {
        try {
          await emailService.sendDeliveryNotification(
            order,
            order.customerEmail,
            status,
          );
        } catch (err) {
          auditLogger.error(`${status} notification email failed`, {
            orderRef: order.ref,
            error: err.message,
          });
        }
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend / trigger a specific email for an order
 * @route   POST /api/v1/orders/admin/:id/send-email
 * @access  Private/Admin
 */
export const resendOrderEmail = async (req, res, next) => {
  try {
    const { type } = req.body;

    const validTypes = ['confirmation', 'delivery'];
    if (!type || !validTypes.includes(type)) {
      return next(
        ErrorResponse.badRequest(
          `Invalid email type. Must be one of: ${validTypes.join(', ')}`,
        ),
      );
    }

    const order = await Order.findOne(orderParamQuery(req.params.id)).populate(
      'customerId',
      'name email',
    );

    if (!order) {
      return next(ErrorResponse.notFound('Order not found'));
    }

    let result;
    try {
      if (type === 'confirmation') {
        result = await emailService.sendOrderConfirmation(
          order,
          order.customerEmail,
        );
      } else if (type === 'delivery') {
        result = await emailService.sendDeliveryNotification(
          order,
          order.customerEmail,
          order.orderStatus,
        );
      }
    } catch (emailError) {
      auditLogger.error(`Order ${type} email send failed`, {
        orderRef: order.ref,
        error: emailError.message,
      });
      return next(ErrorResponse.internal(`Failed to send ${type} email`));
    }

    auditLogger.info(`Order ${type} email sent`, {
      actor: req.user.email,
      orderRef: order.ref,
    });

    res.json({
      success: true,
      data: { sent: true, type, messageId: result?.messageId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an unpaid order (admin only, within 2 hours of creation)
 * @route   DELETE /api/v1/orders/admin/:id
 * @access  Private/Admin
 */
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne(orderParamQuery(req.params.id));

    if (!order) {
      return next(ErrorResponse.notFound('Order not found'));
    }

    if (order.paymentStatus === 'paid') {
      return next(ErrorResponse.badRequest('Paid orders cannot be deleted'));
    }

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const age = Date.now() - new Date(order.createdAt).getTime();
    if (age > TWO_HOURS_MS) {
      return next(
        ErrorResponse.badRequest(
          'Order can only be deleted within 2 hours of placement',
        ),
      );
    }

    await Transaction.deleteMany({ orderId: order._id }).catch(() => {});
    await FraudAlert.deleteMany({ orderId: order._id }).catch(() => {});
    await Order.findByIdAndDelete(order._id);

    auditLogger.info('Order deleted', {
      actor: req.user.email,
      orderId: order._id,
      orderRef: order.ref,
    });

    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a customer's own unpaid order shipping address
 * @route   PATCH /api/v1/orders/:id/address
 * @access  Private
 */
export const updateOrderAddress = async (req, res, next) => {
  try {
    const { name, line1, line2, city, state, phone } = req.body;

    if (!name || !line1 || !city || !state || !phone) {
      return next(
        ErrorResponse.badRequest(
          'Name, address line 1, city, state, and phone are required',
        ),
      );
    }

    const order = await Order.findOne({
      ...orderParamQuery(req.params.id),
      customerId: req.user._id,
    });

    if (!order) {
      return next(ErrorResponse.notFound('Order not found'));
    }

    if (order.paymentStatus === 'paid') {
      return next(
        ErrorResponse.badRequest('Cannot edit the address of a paid order'),
      );
    }

    order.shippingAddress = {
      name,
      line1,
      line2: line2 || '',
      city,
      state,
      phone,
    };
    await order.save();

    auditLogger.info('Order address updated', {
      actor: req.user.email,
      orderId: order._id,
      orderRef: order.ref,
    });

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};
