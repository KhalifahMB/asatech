import { verifyToken } from '../utils/generateToken.js';
import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.js';
import { auditLogger } from '../utils/logger.js';

/**
 * Protect routes - require authentication
 */
export const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(ErrorResponse.unauthorized('Not authorized to access this route'));
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(ErrorResponse.unauthorized('User not found'));
    }

    // Check if user is active
    if (user.status !== 'active') {
      return next(ErrorResponse.forbidden('Account is suspended'));
    }

    // Check if account is locked
    if (user.isLocked()) {
      return next(ErrorResponse.forbidden('Account is locked due to multiple failed attempts'));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(ErrorResponse.unauthorized('Invalid or expired token'));
  }
};

/**
 * Restrict routes to specific roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      auditLogger.warn('Unauthorized access attempt', {
        actor: req.user.email,
        role: req.user.role,
        action: 'authorize',
        resource: req.path,
      });

      return next(
        ErrorResponse.forbidden(`Role '${req.user.role}' is not authorized to access this route`)
      );
    }
    next();
  };
};

/**
 * Optional authentication - attach user if token present
 */
export const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.status === 'active' && !user.isLocked()) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, continue without user
    }
  }

  next();
};
