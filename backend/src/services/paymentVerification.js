import axios from 'axios';
import config from '../config/index.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import FraudAlert from '../models/FraudAlert.js';
import Product from '../models/Product.js';
import emailService from '../utils/email.js';
import { auditLogger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.js';

/**
 * Shared Paystack payment verification and settlement logic.
 *
 * Used by:
 *  - the payment webhook (charge.success / charge.failed)
 *  - the on-demand verification endpoint (GET /payments/verify/:reference)
 *  - the admin sync endpoint and the scripts/verifyTransactions.js job
 *
 * All mutations are guarded atomically so concurrent attempts (webhook +
 * polling verify + manual sync) can never double-settle a transaction,
 * double-decrement stock, or double-send confirmation emails.
 */
export const paystackApi = axios.create({
  baseURL: config.paystack.baseUrl,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${config.paystack.secretKey || ''}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Call Paystack's verify endpoint and return the transaction payload.
 */
export async function fetchPaystackVerification(reference) {
  const { data } = await paystackApi.get(`/transaction/verify/${reference}`);
  return data.data;
}

function toPaystackData(verification) {
  return {
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
}

/**
 * Idempotently settle a successful payment.
 *
 * The transaction is only flipped from pending/processing → successful and the
 * order from unpaid → paid exactly once (atomic findOneAndUpdate guards do the
 * heavy lifting). Returns { status } for callers to report.
 */
export async function settleSuccessfulPayment(transaction, verification) {
  // Amount guard — a successful Paystack payload must match what we charged.
  if (verification.amount && Math.abs(verification.amount - Math.round(transaction.amount * 100)) > 1) {
    await Transaction.updateOne(
      { _id: transaction._id, status: { $in: ['pending', 'processing'] } },
      {
        $set: {
          status: 'failed',
          verifiedAt: new Date(),
          channel: verification.channel,
          gatewayMessage: `Amount mismatch: expected ${transaction.amount * 100}, got ${verification.amount}`,
        },
      },
    );
    auditLogger.error('Payment amount mismatch', {
      reference: transaction.paystackReference,
      expected: transaction.amount * 100,
      received: verification.amount,
    });
    return { status: 'failed', reason: 'amount-mismatch' };
  }

  const settled = await Transaction.findOneAndUpdate(
    { _id: transaction._id, status: { $in: ['pending', 'processing'] } },
    {
      $set: {
        status: 'successful',
        verifiedAt: new Date(),
        paidAt: new Date(verification.paid_at || Date.now()),
        channel: verification.channel,
        gatewayMessage: verification.gateway_response,
        paystackData: toPaystackData(verification),
      },
    },
    { new: true },
  );

  if (!settled) {
    // Someone else already settled it — nothing more to do.
    return { status: 'successful', reason: 'already-settled' };
  }

  const order = await Order.findOneAndUpdate(
    { _id: transaction.orderId, paymentStatus: { $ne: 'paid' } },
    {
      paymentStatus: 'paid',
      orderStatus: 'processing',
      paymentRef: verification.reference,
    },
    { new: true },
  );

  // All order side-effects (stock decrement, confirmation email) happen only
  // on the path that actually flips the order from unpaid → paid.
  if (order) {
    await Promise.all(
      order.items.map((item) =>
        Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } }),
      ),
    );
    try {
      await emailService.sendOrderConfirmation(order, order.customerEmail);
    } catch (err) {
      auditLogger.error('Order confirmation email failed', {
        orderRef: order.ref,
        error: err.message,
      });
    }
  }

  if (settled.riskLevel === 'high') {
    await FraudAlert.findOneAndUpdate(
      { transactionId: settled._id, status: 'new' },
      { status: 'under-review' },
    );
  }

  await logAudit({
    actor: 'system',
    actorRole: 'system',
    action: 'Payment verified',
    resource: `Transaction:${settled.reference}`,
    resourceId: settled._id,
    status: 'success',
    detail: `Order ${order?.ref || transaction.orderRef} paid`,
  });

  return { status: 'successful', reason: 'settled', transaction: settled, order };
}

/**
 * Idempotently mark a payment failed. Only unsettled (pending/processing)
 * transactions are flipped; only unpaid orders are marked failed.
 */
export async function markFailedPayment(transaction, verification = {}) {
  const updated = await Transaction.findOneAndUpdate(
    { _id: transaction._id, status: { $in: ['pending', 'processing'] } },
    {
      $set: {
        status: 'failed',
        verifiedAt: new Date(),
        channel: verification.channel || transaction.channel,
        gatewayMessage: verification.gateway_response,
      },
    },
    { new: true },
  );

  if (!updated) {
    return { status: 'failed', reason: 'already-final' };
  }

  const order = await Order.findOneAndUpdate(
    { _id: transaction.orderId, paymentStatus: 'pending' },
    { paymentStatus: 'failed' },
    { new: true },
  );

  await logAudit({
    actor: 'system',
    actorRole: 'system',
    action: 'Payment failed',
    resource: `Transaction:${updated.reference}`,
    resourceId: updated._id,
    status: 'failed',
    detail: verification.gateway_response || undefined,
  });

  return { status: 'failed', reason: 'marked-failed', transaction: updated, order };
}

/**
 * Verify a single transaction against Paystack and sync its status (and the
 * linked order's) accordingly.
 */
export async function verifyAndSyncTransaction(transaction) {
  const ref = transaction.paystackReference;
  if (!ref) return { status: 'skipped', reason: 'no-paystack-reference' };

  const verification = await fetchPaystackVerification(ref);

  if (verification.status === 'success') {
    return settleSuccessfulPayment(transaction, verification);
  }

  // Paystack reports anything other than success (failed, abandoned, reversed…)
  // as a non-successful outcome for transactions still in flight.
  if (['pending', 'processing'].includes(transaction.status)) {
    return markFailedPayment(transaction, verification);
  }

  return { status: transaction.status, reason: 'already-final' };
}

/**
 * Verify all unsettled transactions in the database and reconcile statuses.
 * Returns a summary for scripts / admin actions.
 */
export async function verifyUnsettledTransactions({ limit = 500 } = {}) {
  const transactions = await Transaction.find({
    status: { $in: ['pending', 'processing'] },
    paystackReference: { $exists: true, $ne: null },
  })
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 500);

  const results = [];
  for (const tx of transactions) {
    try {
      const result = await verifyAndSyncTransaction(tx);
      results.push({
        ref: tx.paystackReference,
        orderRef: tx.orderRef,
        status: result.status,
        reason: result.reason || null,
      });
    } catch (err) {
      auditLogger.error('Transaction sync failed', {
        reference: tx.paystackReference,
        error: err.message,
      });
      results.push({
        ref: tx.paystackReference,
        orderRef: tx.orderRef,
        status: 'error',
        error: err.message,
      });
    }
  }

  return {
    scanned: results.length,
    successful: results.filter((r) => r.status === 'successful').length,
    failed: results.filter((r) => r.status === 'failed').length,
    errors: results.filter((r) => r.status === 'error').length,
    results,
  };
}