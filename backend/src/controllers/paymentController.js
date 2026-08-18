import axios from 'axios';
import crypto from 'crypto';
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

const paystackApi = axios.create({
  baseURL: config.paystack.baseUrl,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${config.paystack.secretKey || ''}`,
    'Content-Type': 'application/json',
  },
});

/**
 * @desc    Initialize Paystack payment
 * @route   POST /api/v1/payments/initialize
 * @access  Private
 */
export const initializePayment = async (req, res, next) => {
  try {
    if (!config.paystack.secretKey) {
      return next(ErrorResponse.internal('Payment gateway not configured'));
    }

    const { email, currency = 'NGN', items, shipping } = req.body;

    // Validate required fields
    if (!email || !items || !Array.isArray(items) || items.length === 0 || !shipping) {
      return next(ErrorResponse.badRequest('Email, items and shipping address are required'));
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
    let paystackResponse;
    try {
      paystackResponse = await paystackApi.post('/transaction/initialize', {
        email,
        amount: Math.round(total * 100), // kobo
        currency,
        metadata: {
          orderId: order._id.toString(),
          orderRef: order.ref,
          customerId: req.user._id.toString(),
        },
        callback_url: `${config.frontendUrl}/#/account/orders/${order.ref}`,
      });
    } catch (err) {
      // Roll back the order since payment could not be initialised
      await Order.findByIdAndDelete(order._id).catch(() => {});
      auditLogger.error('Paystack initialization failed', {
        status: err.response?.status,
        message: err.response?.data?.message || err.message,
      });
      return next(ErrorResponse.paymentRequired('Payment could not be initialised'));
    }

    const { reference, authorization_url, access_code } = paystackResponse.data.data;

    // Create transaction record
    const transaction = await Transaction.create({
      reference: generateTransactionRef(),
      paystackReference: reference,
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
        if (event === 'charge.success') {
          await handleSuccessfulPayment(data);
        } else if (event === 'charge.failed') {
          await handleFailedPayment(data);
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

/**
 * Handle successful payment — verify with Paystack, update order/transaction,
 * decrement stock, send confirmation email.
 */
async function handleSuccessfulPayment(data) {
  const transaction = await Transaction.findOne({ paystackReference: data.reference });

  if (!transaction) {
    auditLogger.error('Transaction not found for webhook', { reference: data.reference });
    return;
  }

  // Idempotency — don't process the same transaction twice
  if (transaction.status === 'successful') return;

  // Verify with Paystack server-side (never trust the webhook payload alone)
  const verifyResponse = await paystackApi.get(`/transaction/verify/${data.reference}`);
  const verification = verifyResponse.data.data;

  if (verification.status !== 'success') {
    auditLogger.warn('Paystack verification failed', {
      reference: data.reference,
      status: verification.status,
    });
    return;
  }

  // Amount mismatch guard
  if (Math.abs(verification.amount - transaction.amount * 100) > 1) {
    auditLogger.error('Payment amount mismatch', {
      reference: data.reference,
      expected: transaction.amount * 100,
      received: verification.amount,
    });
    transaction.status = 'failed';
    await transaction.save();
    return;
  }

  // Update transaction
  transaction.status = 'successful';
  transaction.verifiedAt = new Date();
  transaction.paidAt = new Date(verification.paid_at || Date.now());
  transaction.channel = verification.channel;
  transaction.paystackData = {
    authorization: verification.authorization?.authorization_code,
    card: verification.authorization?.card
      ? {
          last4: verification.authorization.card.last4,
          brand: verification.authorization.card.brand,
          expMonth: verification.authorization.card.exp_month,
          expYear: verification.authorization.card.exp_year,
        }
      : null,
    bank: verification.authorization?.bank,
  };
  await transaction.save();

  // Update order and decrement stock
  const order = await Order.findById(transaction.orderId);
  if (order && order.paymentStatus !== 'paid') {
    order.paymentStatus = 'paid';
    order.orderStatus = 'processing';
    order.paymentRef = data.reference;
    await order.save();

    // Decrement stock atomically
    await Promise.all(
      order.items.map((item) =>
        Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        })
      )
    );

    // Send confirmation email (best-effort)
    try {
      await emailService.sendOrderConfirmation(order, order.customerEmail);
    } catch (err) {
      auditLogger.error('Order confirmation email failed', { error: err.message });
    }
  }

  // Update fraud alert if one exists
  if (transaction.riskLevel === 'high') {
    await FraudAlert.findOneAndUpdate(
      { transactionId: transaction._id, status: 'new' },
      { status: 'under-review' }
    );
  }

  await logAudit({
    actor: 'system',
    actorRole: 'system',
    action: 'Payment verified',
    resource: `Transaction:${transaction.reference}`,
    resourceId: transaction._id,
    status: 'success',
    detail: `Order ${order?.ref} paid`,
  });
}

/**
 * Handle failed payment.
 */
async function handleFailedPayment(data) {
  const transaction = await Transaction.findOne({ paystackReference: data.reference });
  if (!transaction || transaction.status === 'failed') return;

  transaction.status = 'failed';
  await transaction.save();

  const order = await Order.findById(transaction.orderId);
  if (order) {
    order.paymentStatus = 'failed';
    await order.save();
  }

  await logAudit({
    actor: 'system',
    actorRole: 'system',
    action: 'Payment failed',
    resource: `Transaction:${transaction.reference}`,
    resourceId: transaction._id,
    status: 'failed',
    detail: data?.gateway_response,
  });
}
