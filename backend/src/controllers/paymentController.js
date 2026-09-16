import crypto from 'crypto';
import mongoose from 'mongoose';
import config from '../config/index.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import FraudAlert from '../models/FraudAlert.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { calculateFraudScore } from '../utils/calculateFraudScore.js';
import { generateTransactionRef } from '../utils/generateToken.js';
import emailService from '../utils/email.js';
import { logAudit } from '../middleware/audit.js';
import { auditLogger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js';
import {
  paystackApi,
  markFailedPayment,
  verifyAndSyncTransaction,
} from '../services/paymentVerification.js';

/**
 * @desc    Initialize Paystack payment
 * @route   POST /api/v1/payments/initialize
 * @access  Private
 *
 * Idempotent: pass an `idempotencyKey` (body or `x-idempotency-key` header)
 * generated once per checkout attempt. Retries reuse the existing payment
 * session instead of creating duplicate orders / Paystack references.
 */
export const initializePayment = async (req, res, next) => {
  try {
    if (!config.paystack.secretKey) {
      return next(ErrorResponse.internal('Payment gateway not configured'));
    }

    const { email, currency = 'NGN', items, shipping } = req.body;
    const idempotencyKey = req.body.idempotencyKey || req.headers['x-idempotency-key'];

    // Validate required fields
    if (!email || !items || !Array.isArray(items) || items.length === 0 || !shipping) {
      return next(ErrorResponse.badRequest('Email, items and shipping address are required'));
    }

    // Idempotency — short-circuit to the existing session for this attempt key,
    // so reloads / retries / double-submits never create a second order.
    if (idempotencyKey) {
      const existing = await Transaction.findOne({ idempotencyKey }).sort({ createdAt: -1 });
      if (existing) {
        const existingOrder = await Order.findById(existing.orderId);
        // Only reuse a session that still belongs to a pending order. A paid or
        // cancelled order means the key has been consumed — start fresh.
        if (existingOrder && existingOrder.paymentStatus !== 'cancelled') {
          return res.status(201).json({
            success: true,
            duplicate: true,
            data: {
              reference: existing.paystackReference,
              authorizationUrl: '',
              accessCode: null,
              amount: Math.round(existing.amount * 100),
              currency: existing.currency,
              publicKey: config.paystack.publicKey,
              metadata: {
                orderId: existing.orderId.toString(),
                orderRef: existing.orderRef,
              },
            },
          });
        }
      }
    }

    // Fetch products from DB to prevent client-side price tampering
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== items.length) {
      return next(ErrorResponse.badRequest('One or more products are unavailable'));
    }

    // Rebuild items with server-authoritative prices and stock validation
    const orderItems = items.map((item) => {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) {
        throw ErrorResponse.badRequest(`Product ${item.productId} not found`);
      }
      const qty = Math.max(1, Math.min(99, Number(item.quantity) || 1));
      if (product.stock < qty) {
        throw ErrorResponse.badRequest(`Insufficient stock for ${product.name}`);
      }
      return {
        productId: product._id,
        name: product.name,
        image: product.images[0],
        price: product.price,
        quantity: qty,
      };
    });

    // Server-side totals
    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingCost = subtotal >= 500000 ? 0 : 2500;
    const total = subtotal + shippingCost;

    // Fraud assessment
    const fraudAssessment = await calculateFraudScore({
      user: req.user,
      amount: total,
      deviceId: req.headers['x-device-id'],
      ipAddress: req.ip,
    });

    // Create pending order (stock is decremented only on successful payment)
    const order = await Order.create({
      customerId: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      items: orderItems,
      subtotal,
      shipping: shippingCost,
      total,
      shippingAddress: shipping,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      riskScore: fraudAssessment.score,
      riskLevel: fraudAssessment.riskLevel,
      timeline: [{ step: 'placed', at: new Date(), done: true }],
    });

    // Initialize Paystack transaction
    // Per Paystack API docs, `amount` must be a string in the currency's subunit
    // (kobo for NGN) and `metadata` must be a stringified JSON object.
    let paystackResponse;
    try {
      const amountInKobo = Math.round(total * 100);
      paystackResponse = await paystackApi.post('/transaction/initialize', {
        email,
        amount: String(amountInKobo), // string per Paystack API docs
        currency,
        metadata: JSON.stringify({
          orderId: order._id.toString(),
          orderRef: order.ref,
          customerId: req.user._id.toString(),
        }),
        callback_url: `${config.frontendUrl}/payment/${order._id}/success`,
      });
    } catch (err) {
      // Roll back the order since payment could not be initialised
      await Order.findByIdAndDelete(order._id).catch(() => {});
      const paystackMessage =
        err.response?.data?.message || err.response?.data?.error || err.message;
      auditLogger.error('Paystack initialization failed', {
        status: err.response?.status,
        message: paystackMessage,
      });
      return next(
        ErrorResponse.paymentRequired(paystackMessage || 'Payment could not be initialised')
      );
    }

    const { reference, authorization_url, access_code } = paystackResponse.data.data;

    // Create transaction record (handle a rare concurrent race on the same
    // idempotency key by rolling back and returning the other session).
    let transaction;
    try {
      transaction = await Transaction.create({
        reference: generateTransactionRef(),
        paystackReference: reference,
        idempotencyKey: idempotencyKey || undefined,
        orderId: order._id,
        orderRef: order.ref,
        customerId: req.user._id,
        customerName: req.user.name,
        customerEmail: req.user.email,
        amount: total,
        currency,
        status: 'pending',
        riskScore: fraudAssessment.score,
        riskLevel: fraudAssessment.riskLevel,
      });
    } catch (err) {
      await Order.findByIdAndDelete(order._id).catch(() => {});
      if (err.code === 11000 && idempotencyKey) {
        const existing = await Transaction.findOne({ idempotencyKey }).sort({ createdAt: -1 });
        if (existing) {
          return res.status(201).json({
            success: true,
            duplicate: true,
            data: {
              reference: existing.paystackReference,
              authorizationUrl: '',
              accessCode: null,
              amount: Math.round(existing.amount * 100),
              currency: existing.currency,
              publicKey: config.paystack.publicKey,
              metadata: {
                orderId: existing.orderId.toString(),
                orderRef: existing.orderRef,
              },
            },
          });
        }
      }
      throw err;
    }

    // Link back to order
    order.transactionId = transaction._id;
    order.paymentRef = reference;
    await order.save();

    // High-risk fraud alert
    if (fraudAssessment.riskLevel === 'high') {
      await createFraudAlert(order, transaction, fraudAssessment);
    }

    await logAudit({
      actor: req.user.email,
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'Payment initialized',
      resource: `Order:${order.ref}`,
      resourceId: order._id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      success: true,
      data: {
        reference,
        authorizationUrl: authorization_url,
        accessCode: access_code,
        amount: Math.round(total * 100),
        currency,
        publicKey: config.paystack.publicKey,
        metadata: {
          orderId: order._id.toString(),
          orderRef: order.ref,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify a payment against Paystack and sync its status
 * @route   GET /api/v1/payments/verify/:reference
 * @access  Private (customer owns it, or admin)
 *
 * On-demand reconciliation: customers / the payment screen call this to confirm
 * whether a payment succeeded. It never trusts the browser — it asks Paystack
 * and settles the order through the same idempotent path as the webhook.
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const reference = req.params.reference;
    if (!reference) {
      return next(ErrorResponse.badRequest('A transaction reference is required'));
    }

    const transaction = await Transaction.findOne({
      $or: [{ paystackReference: reference }, { reference }],
    });

    if (!transaction) {
      return next(ErrorResponse.notFound('Transaction not found'));
    }

    // Customers can only verify their own payments; admins can verify any.
    if (
      req.user.role !== 'admin' &&
      transaction.customerId.toString() !== req.user._id.toString()
    ) {
      return next(ErrorResponse.forbidden('You cannot verify this transaction'));
    }

    let result;
    if (transaction.status === 'successful') {
      result = { status: 'successful', reason: 'already-settled' };
    } else {
      result = await verifyAndSyncTransaction(transaction);
    }

    const order = await Order.findById(transaction.orderId).select('ref paymentStatus total');

    res.json({
      success: true,
      data: {
        transactionStatus: result.status,
        paymentStatus: order?.paymentStatus,
        orderId: order?._id,
        orderRef: order?.ref,
        reference: transaction.paystackReference,
        amount: order?.total ?? transaction.amount,
        currency: transaction.currency,
        paidAt: transaction.paidAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resume an existing payment session for an unpaid order
 * @route   POST /api/v1/payments/resume
 * @access  Private
 *
 * Lets a customer continue paying for an order whose payment was initialized
 * but not completed (e.g. abandoned checkout, failed attempt). Reuses the
 * original Paystack reference so completion maps back to the same
 * transaction record via the webhook.
 */
export const resumePayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return next(ErrorResponse.badRequest('orderId is required'));
    }

    const orderQuery = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { ref: orderId };
    const order = await Order.findOne(orderQuery);

    if (!order) {
      return next(ErrorResponse.notFound('Order not found'));
    }

    // Customers can only resume their own orders
    if (
      req.user.role !== 'admin' &&
      order.customerId.toString() !== req.user._id.toString()
    ) {
      return next(ErrorResponse.forbidden('You cannot resume this order'));
    }

    // Already paid — nothing to resume
    if (order.paymentStatus === 'paid') {
      return res.json({
        success: true,
        data: {
          paid: true,
          orderId: order._id.toString(),
          orderRef: order.ref,
        },
      });
    }

    // Reuse the latest payment session so the webhook maps back correctly
    const transaction = await Transaction.findOne({ orderId: order._id }).sort({
      createdAt: -1,
    });

    const reference = transaction?.paystackReference || order.paymentRef;
    if (!reference) {
      return next(
        ErrorResponse.badRequest(
          'No payment session was found for this order. Please start a new checkout.'
        )
      );
    }

    return res.json({
      success: true,
      data: {
        paid: false,
        reference,
        amount: Math.round(order.total * 100),
        currency: transaction?.currency || 'NGN',
        email: order.customerEmail,
        publicKey: config.paystack.publicKey,
        orderId: order._id.toString(),
        orderRef: order.ref,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a fraud alert and notify all admins (best-effort).
 */
async function createFraudAlert(order, transaction, fraudAssessment) {
  const alert = await FraudAlert.create({
    transactionId: transaction._id,
    transactionRef: transaction.reference,
    orderId: order._id,
    orderRef: order.ref,
    customerId: order.customerId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    amount: order.total,
    riskScore: fraudAssessment.score,
    riskLevel: fraudAssessment.riskLevel,
    severity: 'high',
    factors: fraudAssessment.factors,
  });

  // Notify admins in the background — do not block the request
  (async () => {
    try {
      const admins = await User.find({ role: 'admin', status: 'active' });
      await Promise.allSettled(
        admins.map((admin) => emailService.sendFraudAlert(alert, admin.email))
      );
    } catch (err) {
      auditLogger.error('Failed to notify admins of fraud alert', { error: err.message });
    }
  })();

  auditLogger.warn('High-risk transaction flagged', {
    transactionRef: transaction.reference,
    riskScore: fraudAssessment.score,
  });
}

/**
 * @desc    Handle Paystack webhook
 * @route   POST /api/v1/payments/webhook
 * @access  Public (signature-verified)
 *
 * NOTE: This handler receives the RAW request body (see app.js) so the
 * HMAC signature can be verified byte-for-byte against Paystack's header.
 */
export const handleWebhook = async (req, res) => {
  try {
    if (!config.paystack.webhookSecret) {
      auditLogger.error('Webhook received but secret not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    // req.body is a Buffer (from express.raw)
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const signature = req.headers['x-paystack-signature'];

    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const expected = crypto
      .createHmac('sha512', config.paystack.webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (
      expected.length !== signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      auditLogger.warn('Invalid webhook signature', { ip: req.ip });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse JSON manually since we used raw parser
    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { event, data } = payload;

    auditLogger.info('Paystack webhook received', {
      event,
      reference: data?.reference,
    });

    // Acknowledge quickly, then process asynchronously
    res.status(200).json({ status: 'received' });

    setImmediate(async () => {
      try {
        const transaction = await Transaction.findOne({ paystackReference: data.reference });
        if (!transaction) {
          auditLogger.error('Webhook transaction not found', { reference: data.reference });
          return;
        }

        if (event === 'charge.success') {
          // Verify server-side with Paystack, then settle through the shared
          // idempotent path (same logic as the verify endpoint / sync script).
          await verifyAndSyncTransaction(transaction);
        } else if (event === 'charge.failed') {
          await markFailedPayment(transaction, data);
        }
      } catch (err) {
        auditLogger.error('Async webhook processing failed', {
          event,
          error: err.message,
        });
      }
    });
  } catch (error) {
    auditLogger.error('Webhook processing failed', { error: error.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
};