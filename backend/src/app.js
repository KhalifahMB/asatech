import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';

import config from './config/index.js';
import swaggerSpec from './config/swagger.js';
import connectDB from './config/database.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import transactionRoutes from './routes/transactions.js';
import fraudRoutes from './routes/fraud.js';
import adminRoutes from './routes/admin.js';
import adminProductRoutes from './routes/adminProducts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Product image files live here and are served with aggressive caching
const imagesDir = path.join(__dirname, 'assets', 'images');

// Connect to database
connectDB();

const app = express();

// ─── Trust proxy ───────────────────────────────────────────────────────────
// Required behind load balancers/reverse proxies so req.ip is accurate for
// rate limiting and audit logging. Enabled in production by default.
if (config.trustProxy) {
  app.set('trust proxy', 1);
}
app.disable('x-powered-by');

// ─── Security middleware ───────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// CORS — restrict to configured frontend origin(s)
const allowedOrigins = [config.frontendUrl, ...config.extraOrigins];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn('CORS request blocked', { origin });
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Device-ID',
      'X-Requested-With',
    ],
    maxAge: 86400,
  }),
);

// ─── Body parsing ──────────────────────────────────────────────────────────
// Payment webhook needs the raw body for signature verification, so it must
// be parsed with a special raw parser mounted before the JSON parser.
app.use(
  `/api/${config.apiVersion}/payments/webhook`,
  express.raw({ type: 'application/json', limit: '1mb' }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Injection protection ──────────────────────────────────────────────────
// Strips MongoDB operators like `$` and `.` from user input.
app.use(mongoSanitize());
// Prevents HTTP Parameter Pollution attacks.
app.use(hpp());

// ─── Compression ───────────────────────────────────────────────────────────
app.use(compression());

// ─── Static image assets ───────────────────────────────────────────────────
// Product images are served from the backend so they no longer ship with the
// frontend bundle. Cache headers keep browsers fetching each image once.
app.use(
  `/api/${config.apiVersion}/images`,
  express.static(imagesDir, {
    etag: true,
    lastModified: true,
    maxAge: '30d',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);

// ─── Logging ───────────────────────────────────────────────────────────────
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
      skip: (req) => req.path === '/health',
    }),
  );
}

// ─── Rate limiting ─────────────────────────────────────────────────────────
app.use(`/api/${config.apiVersion}`, apiLimiter);

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptime: process.uptime(),
  });
});

// ─── API routes ────────────────────────────────────────────────────────────
const apiBase = `/api/${config.apiVersion}`;

app.use(`${apiBase}/auth`, authRoutes);
app.use(`${apiBase}/products`, productRoutes);
// Admin product routes must be registered before generic order routes so the
// path `admin/products` doesn't get shadowed
app.use(`${apiBase}/admin/products`, adminProductRoutes);
app.use(`${apiBase}/admin`, adminRoutes);
app.use(`${apiBase}/orders`, orderRoutes);
app.use(`${apiBase}/payments`, paymentRoutes);
app.use(`${apiBase}/transactions`, transactionRoutes);
app.use(`${apiBase}/fraud/alerts`, fraudRoutes);

// ─── API documentation ─────────────────────────────────────────────────────
if (!config.isProduction || process.env.ENABLE_DOCS === 'true') {
  app.use(`${apiBase}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Root
app.get('/', (_req, res) => {
  res.json({
    name: 'ASATECH API',
    version: '1.0.0',
    docs: `${apiBase}/docs`,
    health: '/health',
  });
});

// ─── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 'NOT_FOUND',
    },
  });
});

// ─── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ──────────────────────────────────────────────────────────
const PORT = config.port;
const server = app.listen(PORT, () => {
  logger.info(`ASATECH API running in ${config.nodeEnv} mode on port ${PORT}`);
  if (!config.isProduction) {
    logger.info(`Docs: http://localhost:${PORT}${apiBase}/docs`);
  }
});

// Graceful shutdown
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection', {
    error: err.message,
    stack: err.stack,
  });
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

export default app;
