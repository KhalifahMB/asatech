import User from '../models/User.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import FraudAlert from '../models/FraudAlert.js';
import AuditLog from '../models/AuditLog.js';
import config from '../config/index.js';
import ErrorResponse from '../utils/errorResponse.js';
import { sampleProducts } from '../data/sampleProducts.js';
import { audit, logAudit } from '../middleware/audit.js';

/**
 * @desc    Get all customers (admin only)
 * @route   GET /api/v1/admin/customers
 * @access  Private/Admin
 */
export const getCustomers = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = { role: 'customer' };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit);

    // Get order stats for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orderStats = await Order.aggregate([
          { $match: { customerId: customer._id } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$total' },
            },
          },
        ]);

        return {
          ...customer.toObject(),
          orders: orderStats[0]?.totalOrders || 0,
          totalSpent: orderStats[0]?.totalSpent || 0,
        };
      })
    );

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: customersWithStats.length,
      total,
      page: Number(page),
      data: customersWithStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get customer by ID (admin only)
 * @route   GET /api/v1/admin/customers/:id
 * @access  Private/Admin
 */
export const getCustomer = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id)
      .select('-password')
      .populate('addresses');

    if (!customer || customer.role !== 'customer') {
      return next(ErrorResponse.notFound('Customer not found'));
    }

    // Get order history
    const orders = await Order.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const orderStats = await Order.aggregate([
      { $match: { customerId: customer._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        ...customer.toObject(),
        orders: orderStats[0]?.totalOrders || 0,
        totalSpent: orderStats[0]?.totalSpent || 0,
        orderHistory: orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get audit logs (admin only)
 * @route   GET /api/v1/admin/audit-logs
 * @access  Private/Admin
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, actor, status, search, page = 1, limit = 50 } = req.query;

    const query = {};

    if (action) {
      query.action = action;
    }

    if (actor) {
      query.actor = { $regex: actor, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { actor: { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { detail: { $regex: search, $options: 'i' } },
      ];
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit);

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      count: logs.length,
      total,
      page: Number(page),
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard analytics (admin only)
 * @route   GET /api/v1/admin/analytics
 * @access  Private/Admin
 */
export const getAnalytics = async (req, res, next) => {
  try {
    // Revenue series (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueSeries = await Transaction.aggregate([
      {
        $match: {
          status: 'successful',
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Transactions series
    const transactionsSeries = await Transaction.aggregate([
      {
        $match: { createdAt: { $gte: sixMonthsAgo } },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Risk distribution
    const riskDistribution = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 },
        },
      },
    ]);

    // Category sales
    const categorySales = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          count: { $sum: '$items.quantity' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Format data for frontend
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const formatSeries = (data, valueKey) => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push({
          label: monthNames[d.getMonth()],
          value: 0,
        });
      }

      data.forEach(item => {
        const monthIndex = months.findIndex(
          m => m.label === monthNames[item._id.month - 1]
        );
        if (monthIndex !== -1) {
          months[monthIndex].value = valueKey === 'total' 
            ? Math.round(item.total / 1000000 * 10) / 10 // Convert to millions
            : item.count;
        }
      });

      return months;
    };

    res.json({
      success: true,
      data: {
        revenueSeries: formatSeries(revenueSeries, 'total'),
        transactionsSeries: formatSeries(transactionsSeries, 'count'),
        riskDistribution: [
          { label: 'Low', value: Math.round((riskDistribution.find(r => r._id === 'low')?.count || 0) / (riskDistribution.reduce((a, b) => a + b.count, 0) || 1) * 100), color: '#10b981' },
          { label: 'Medium', value: Math.round((riskDistribution.find(r => r._id === 'medium')?.count || 0) / (riskDistribution.reduce((a, b) => a + b.count, 0) || 1) * 100), color: '#f59e0b' },
          { label: 'High', value: Math.round((riskDistribution.find(r => r._id === 'high')?.count || 0) / (riskDistribution.reduce((a, b) => a + b.count, 0) || 1) * 100), color: '#ef4444' },
        ],
        categorySales: categorySales.map(c => ({
          label: c._id || 'Other',
          value: c.count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Seed the default admin + sample catalogue (admin only, opt-in)
 * @route   POST /api/v1/admin/maintenance/seed-catalogue
 * @access  Private/Admin
 *
 * Mirrors `npm run seed` from the dashboard. Requires `{ confirm: true }` to
 * run. Only creates resources that don't already exist — an existing admin or
 * catalogue is left untouched.
 */
export const seedCatalogue = async (req, res, next) => {
  try {
    if (!req.body?.confirm) {
      return next(
        ErrorResponse.badRequest(
          'This action creates an admin account and sample products. Pass { confirm: true } to proceed.'
        )
      );
    }

    if (!config.admin.password) {
      return next(
        ErrorResponse.internal(
          'ADMIN_PASSWORD is not configured on the server. Add it to the backend .env to seed the default admin.'
        )
      );
    }

    const existingAdmin = await User.findOne({ role: 'admin' });
    let adminCreated = false;
    if (!existingAdmin) {
      try {
        await User.create({
          name: 'ASATECH Admin',
          email: config.admin.email,
          password: config.admin.password,
          role: 'admin',
          phone: '+2348000000000',
          emailVerified: true,
        });
        adminCreated = true;
      } catch (error) {
        return next(
          ErrorResponse.internal(`Failed to create the admin account: ${error.message}`)
        );
      }
    }

    const existingProducts = await Product.countDocuments();
    let productsSeeded = 0;
    if (existingProducts === 0) {
      await Product.insertMany(sampleProducts);
      productsSeeded = sampleProducts.length;
    }

    await logAudit({
      actor: req.user.email,
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'Catalogue seeded',
      resource: 'Maintenance:seed-catalogue',
      resourceId: req.user._id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: {
        adminCreated,
        adminEmail: config.admin.email,
        productsSeeded,
        message:
          adminCreated || productsSeeded > 0
            ? 'Sample catalogue seeded successfully'
            : 'Sample catalogue already present — nothing was changed',
      },
    });
  } catch (error) {
    next(error);
  }
};
