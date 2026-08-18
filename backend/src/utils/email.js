import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from './logger.js';

/**
 * Email service using Nodemailer
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = !!(
      config.email.host &&
      config.email.user &&
      config.email.pass
    );

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });
    } else {
      logger.warn('Email service not configured. Emails will be logged to console.');
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content
   */
  async send(options) {
    const { to, subject, html, text } = options;

    const mailOptions = {
      from: config.email.from,
      to,
      subject,
      html,
      text: text || this._htmlToText(html),
    };

    if (!this.isConfigured) {
      logger.info(`[EMAIL] To: ${to} | Subject: ${subject}`);
      logger.info(`[EMAIL] Content: ${text || html.substring(0, 200)}...`);
      return { messageId: 'logged-only' };
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`Email send failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email, resetToken) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>You requested a password reset for your ASATECH account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Reset Password
        </a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">ASATECH - Premium Gadgets</p>
      </div>
    `;

    return this.send({
      to: email,
      subject: 'ASATECH - Password Reset Request',
      html,
      text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order, customerEmail) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Order Confirmed!</h2>
        <p>Thank you for your order, ${order.shippingAddress.name}!</p>
        <p><strong>Order Reference:</strong> ${order.ref}</p>
        <p><strong>Total:</strong> ₦${order.total.toLocaleString()}</p>
        <h3>Order Details:</h3>
        <ul>
          ${order.items.map(item => `
            <li>${item.name} × ${item.quantity} - ₦${(item.price * item.quantity).toLocaleString()}</li>
          `).join('')}
        </ul>
        <p>We'll notify you when your order ships.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">ASATECH - Premium Gadgets</p>
      </div>
    `;

    return this.send({
      to: customerEmail,
      subject: `ASATECH - Order Confirmation ${order.ref}`,
      html,
      text: `Order confirmed! Reference: ${order.ref}, Total: ₦${order.total.toLocaleString()}`,
    });
  }

  /**
   * Send fraud alert email to admin
   */
  async sendFraudAlert(alert, adminEmail) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Fraud Alert</h2>
        <p>A high-risk transaction has been flagged.</p>
        <p><strong>Customer:</strong> ${alert.customerName}</p>
        <p><strong>Risk Score:</strong> ${alert.riskScore}</p>
        <p><strong>Amount:</strong> ₦${alert.amount.toLocaleString()}</p>
        <p><strong>Factors:</strong> ${alert.factors.join(', ')}</p>
        <p>Please review in the admin dashboard.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">ASATECH Security System</p>
      </div>
    `;

    return this.send({
      to: adminEmail,
      subject: `ASATECH - Fraud Alert: Risk Score ${alert.riskScore}`,
      html,
      text: `Fraud alert! Customer: ${alert.customerName}, Risk: ${alert.riskScore}, Amount: ₦${alert.amount.toLocaleString()}`,
    });
  }

  /**
   * Simple HTML to text converter
   */
  _htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}

export default new EmailService();
