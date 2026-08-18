import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

/**
 * Application configuration loaded from environment variables.
 * Fails fast if required variables are missing in production.
 */
const config = {
  // Server
  nodeEnv,
  isProduction,
  port: parseInt(process.env.PORT, 10) || 8080,
  apiVersion: process.env.API_VERSION || 'v1',
  trustProxy: process.env.TRUST_PROXY === 'true' || isProduction,

  // Database
  mongodbUri: process.env.MONGODB_URI,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  jwtCookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE, 10) || 7,

  // Paystack
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
    baseUrl: 'https://api.paystack.co',
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'ASATECH <noreply@asatech.ng>',
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  // Extra allowed CORS origins (comma-separated)
  extraOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Security
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Default Admin (used only by seed script)
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@asatech.ng',
    password: process.env.ADMIN_PASSWORD,
  },
};

// ─── Required environment variables validation ────────────────────────────
const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];

// In production, payment credentials are also required
if (isProduction) {
  requiredVars.push(
    'PAYSTACK_SECRET_KEY',
    'PAYSTACK_PUBLIC_KEY',
    'PAYSTACK_WEBHOOK_SECRET',
  );
}

const missing = requiredVars.filter((k) => !process.env[k]);
if (missing.length > 0 && nodeEnv !== 'test') {
  console.error('\n❌ Missing required environment variables:');
  missing.forEach((v) => console.error(`   - ${v}`));
  console.error('\nCopy .env.example to .env and configure these variables.\n');
  process.exit(1);
}

// ─── Refuse weak JWT secret in production ─────────────────────────────────
if (isProduction) {
  const secret = config.jwtSecret || '';
  const weakSecrets = [
    'your-super-secret-jwt-key-change-in-production',
    'default-dev-secret-change-in-production',
    'secret',
    'jwtsecret',
  ];

  if (secret.length < 32 || weakSecrets.includes(secret)) {
    console.error(
      '\n❌ JWT_SECRET is too weak for production use.\n' +
        '   Generate a strong secret with:\n' +
        "   node -e \"console.log(require('crypto').randomBytes(64).toString('base64'))\"\n",
    );
    process.exit(1);
  }
}

// ─── Development-only warning for missing Paystack keys ───────────────────
if (!isProduction && !config.paystack.secretKey) {
  console.warn(
    '⚠️  PAYSTACK_SECRET_KEY not configured. Payment endpoints will not work.',
  );
}

export default config;
