import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const jsonMessage = (message, code) => ({
  success: false,
  error: { message, code },
});

/**
 * General API rate limiter.
 * Skips /health checks so uptime monitors don't blow the limit.
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: jsonMessage('Too many requests, please try again later', 'RATE_LIMIT_EXCEEDED'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  handler: (req, res, _next, options) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: jsonMessage(
    'Too many authentication attempts, please try again after 15 minutes',
    'AUTH_RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Payment endpoint rate limiter
 */
export const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: jsonMessage('Too many payment attempts, please try again later', 'PAYMENT_RATE_LIMIT_EXCEEDED'),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Webhook rate limiter (more permissive for Paystack)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: jsonMessage('Too many webhook requests', 'WEBHOOK_RATE_LIMIT_EXCEEDED'),
  standardHeaders: true,
  legacyHeaders: false,
});
