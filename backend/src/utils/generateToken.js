import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Generate JWT token for user
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

/**
 * Generate password reset token (6-digit code)
 * @returns {string} Reset token
 */
export const generateResetToken = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate order reference
 * @returns {string} Order reference (e.g., AST-ABC123)
 */
export const generateOrderRef = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'AST-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
};

/**
 * Generate transaction reference
 * @returns {string} Transaction reference
 */
export const generateTransactionRef = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'TXN-';
  for (let i = 0; i < 8; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
};
