import Order from '../models/Order.js';
import Product from '../models/Product.js';
import ErrorResponse from '../utils/errorResponse.js';

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
 * @desc    Get order by reference
 * @route   GET /api/v1/orders/:ref
 * @access  Private
 */
export const getOrder = async (req, res, next) => {
  try {
    const query = {
      $or: [{ ref: req.params.ref }, { _id: req.params.ref }],
    };

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
 * @desc    Update order status (admin only)
 * @route   PATCH /api/v1/admin/orders/:ref/status
 * @access  Private/Admin
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return next(ErrorResponse.badRequest('Status is required'));
    }

    const order = await Order.findOneAndUpdate(
      { ref: req.params.ref },
      { orderStatus: status },
      { new: true }
    );

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
