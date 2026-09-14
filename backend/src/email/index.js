import path from 'path';
import { fileURLToPath } from 'url';
import nunjucks from 'nunjucks';
import { BrevoClient } from '@getbrevo/brevo';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, 'templates');

// ─── Nunjucks environment ─────────────────────────────────────────────────────

const env = nunjucks.configure(TEMPLATES_DIR, {
  autoescape: true,
  throwOnUndefined: false,
});

/** Format a value as Nigerian Naira, e.g. ₦1,250,000. */
env.addFilter('naira', (value) => {
  const num = Number(value || 0);
  return `₦${num.toLocaleString('en-NG')}`;
});

/** Render a Nunjucks template to HTML string. */
function render(template, context) {
  return env.render(template, {
    year: new Date().getFullYear(),
    ...context,
  });
}

/**
 * Email service backed by Brevo (transactional email API), with Nunjucks
 * templates. When BREVO_API_KEY is not configured, emails are logged to the
 * console instead of being delivered (safe for local development).
 */
class EmailService {
  constructor() {
    this.apiKey = config.brevo.apiKey;
    this.sender = {
      email: config.brevo.senderEmail,
      name: config.brevo.senderName,
    };
    this.client = null;
    this.isConfigured = Boolean(this.apiKey);

    if (this.isConfigured) {
      this.client = new BrevoClient({ apiKey: this.apiKey, timeoutInSeconds: 30 });
    } else {
      logger.warn(
        'BREVO_API_KEY not configured — emails will be logged to console and NOT delivered.'
      );
    }
  }

  /**
   * Deliver an email.
   * @param {Object} options
   * @param {string} options.to       Recipient email address
   * @param {string} [options.toName] Recipient display name
   * @param {string} options.subject  Email subject line
   * @param {string} options.template Nunjucks template filename (e.g. 'email-verification.njk')
   * @param {Object} [options.context] Template variables
   * @returns {Promise<{ messageId?: string; message: string; loggedOnly: boolean }>}
   */
  async send({ to, toName, subject, template, context = {} }) {
    const html = render(template, context);
    const text = this._htmlToText(html);

    if (!this.isConfigured || !this.client) {
      logger.info(`[EMAIL(logged-only)] To: ${to} | Subject: ${subject}`);
      logger.info(`[EMAIL(logged-only)] Content: ${text.substring(0, 300)}...`);
      return { loggedOnly: true, message: 'Email logged to console (Brevo not configured)' };
    }

    try {
      const result = await this.client.transactionalEmails.sendTransacEmail({
        subject,
        htmlContent: html,
        textContent: text,
        sender: this.sender,
        to: [{ email: to, ...(toName ? { name: toName } : {}) }],
      });
      logger.info(`Email sent to ${to} | Subject: ${subject} | MessageId: ${result.messageId}`);
      return { messageId: result.messageId, loggedOnly: false };
    } catch (error) {
      logger.error(`Brevo email send failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Email verification OTP.
   * @param {import('../models/User.js').default} user
   * @param {string} otp 6-digit one-time code
   */
  sendVerificationOtp(user, otp) {
    return this.send({
      to: user.email,
      toName: user.name,
      subject: 'Verify your ASATECH email',
      template: 'email-verification.njk',
      context: {
        user: { name: user.name, email: user.email },
        otp,
        expiresInMinutes: 10,
      },
    });
  }

  /**
   * Password reset OTP.
   * @param {import('../models/User.js').default} user
   * @param {string} otp 6-digit one-time code
   */
  sendPasswordReset(user, otp) {
    return this.send({
      to: user.email,
      toName: user.name,
      subject: 'ASATECH password reset code',
      template: 'password-reset.njk',
      context: {
        user: { name: user.name, email: user.email },
        otp,
        expiresInMinutes: 15,
      },
    });
  }

  /**
   * Order confirmation email (sent after a successful payment).
   * @param {import('../models/Order.js').default} order
   * @param {string} customerEmail
   */
  sendOrderConfirmation(order, customerEmail) {
    return this.send({
      to: customerEmail,
      toName: order.customerName,
      subject: `ASATECH — order confirmed ${order.ref}`,
      template: 'order-confirmation.njk',
      context: {
        order,
        trackingUrl: `${config.frontendUrl}/#/account/orders/${order.ref}`,
      },
    });
  }

  /**
   * Delivery / dispatch notification email.
   * @param {import('../models/Order.js').default} order
   * @param {string} customerEmail
   * @param {string} status 'shipped' | 'delivered' | any orderStatus
   */
  sendDeliveryNotification(order, customerEmail, status = 'shipped') {
    const statusLabel =
      {
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
      }[status] || status;

    return this.send({
      to: customerEmail,
      toName: order.customerName,
      subject: `ASATECH — your order ${statusLabel.toLowerCase()} ${order.ref}`,
      template: 'delivery-notification.njk',
      context: {
        order,
        status,
        statusLabel,
        trackingUrl: `${config.frontendUrl}/#/account/orders/${order.ref}`,
      },
    });
  }

  /**
   * Fraud alert email to admins.
   * @param {import('../models/FraudAlert.js').default} alert
   * @param {string} adminEmail
   */
  sendFraudAlert(alert, adminEmail) {
    return this.send({
      to: adminEmail,
      subject: `ASATECH — fraud alert: ${alert.riskScore}/100`,
      template: 'fraud-alert.njk',
      context: {
        alert,
        reviewUrl: `${config.frontendUrl}/#/admin/fraud-alerts/${alert._id}`,
      },
    });
  }

  /**
   * Minimal HTML → plain-text conversion for the textContent part of emails.
   */
  _htmlToText(html) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&times;/g, 'x')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

export default new EmailService();