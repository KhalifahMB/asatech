/**
 * ASATECH OpenAPI 3.0 specification.
 *
 * Authored as a plain object (instead of scanning route/controller JSDoc
 * comments) so the Swagger UI always has a complete, tagged catalogue of the
 * API regardless of how controllers are annotated internally.
 */

const apiBase = `/api/${process.env.API_VERSION || 'v1'}`;

// ─── Small helpers so every operation reads consistently ───────────────────
const bearer = [{ bearerAuth: [] }];
const pathParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
});

const ok = (description) => ({ 200: { description } });

const BadRequest = { $ref: '#/components/responses/BadRequest' };
const Unauthorized = { $ref: '#/components/responses/Unauthorized' };
const Forbidden = { $ref: '#/components/responses/Forbidden' };
const NotFound = { $ref: '#/components/responses/NotFound' };
const TooMany = { $ref: '#/components/responses/TooMany' };

const errors = {
  400: BadRequest,
  401: Unauthorized,
  403: Forbidden,
  404: NotFound,
  429: TooMany,
};

const jsonBody = (schemaRef, examples) => ({
  content: {
    'application/json': {
      schema: { $ref: `#/components/schemas/${schemaRef}` },
      example: examples,
    },
  },
});

// Response bodies are a thin `{ success: true, data: ... }` envelope; adding
// full schema detail for every endpoint bloats the spec, so successes carry a
// one-line description unless an example adds real value.
const enriched = (base, extra) => ({ ...base, ...extra });

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ASATECH API',
    version: '1.0.0',
    description: 'ASATECH E-Commerce Platform API',
  },
  servers: [{ url: apiBase, description: 'ASATECH API' }],
  tags: [
    { name: 'Auth', description: 'Authentication, registration and account security' },
    { name: 'Products', description: 'Catalogue browsing and admin product management' },
    { name: 'Orders', description: 'Customer order management and admin fulfilment' },
    { name: 'Payments', description: 'Paystack payment flow, verification and webhooks' },
    { name: 'Transactions', description: 'Payment transaction records and reconciliation' },
    { name: 'Admin', description: 'Admin console: customers, analytics, audit logs and maintenance' },
    { name: 'Fraud', description: 'Fraud alert triage' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    responses: {
      BadRequest: {
        description: 'Invalid input or missing required fields',
      },
      Unauthorized: {
        description: 'Missing or invalid access token',
      },
      Forbidden: {
        description: 'Authenticated but not allowed to perform this action',
      },
      NotFound: {
        description: 'The requested resource was not found',
      },
      TooMany: {
        description: 'Rate limit exceeded',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            required: ['message'],
            properties: {
              message: { type: 'string', example: 'Something went wrong' },
              code: { type: 'string', example: 'ERROR' },
            },
          },
        },
      },
      UserRegistration: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Ada Obi' },
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          password: { type: 'string', format: 'password', minLength: 8 },
          phone: { type: 'string', example: '+2348000000000' },
        },
      },
      UserLogin: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          password: { type: 'string', format: 'password' },
        },
      },
      VerifyEmail: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          otp: { type: 'string', example: '123456' },
        },
      },
      ResendVerification: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email', example: 'ada@example.com' } },
      },
      PasswordResetRequest: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email', example: 'ada@example.com' } },
      },
      PasswordReset: {
        type: 'object',
        required: ['email', 'otp', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          otp: { type: 'string', example: '123456' },
          password: { type: 'string', format: 'password', minLength: 8, description: 'New password' },
        },
      },
      ChangePassword: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password' },
          newPassword: { type: 'string', format: 'password', minLength: 8 },
        },
      },
      InitializePayment: {
        type: 'object',
        required: ['email', 'items', 'shipping'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          currency: { type: 'string', enum: ['NGN', 'GHS', 'USD'], default: 'NGN' },
          items: {
            type: 'array',
            description: 'Cart items to be stitched into an order',
            items: {
              type: 'object',
              properties: {
                product: { type: 'string', description: 'Product ID' },
                qty: { type: 'integer', minimum: 1, example: 1 },
              },
            },
          },
          shipping: {
            type: 'object',
            description: 'Shipping address',
            properties: {
              name: { type: 'string', example: 'Ada Obi' },
              phone: { type: 'string', example: '+2348000000000' },
              address: { type: 'string', example: '12 Broad Street, Lagos' },
              city: { type: 'string', example: 'Lagos' },
              state: { type: 'string', example: 'Lagos' },
              country: { type: 'string', example: 'Nigeria' },
            },
          },
          idempotencyKey: {
            type: 'string',
            description: 'Reuse the same key to resume an identical checkout attempt instead of creating a new order',
          },
        },
      },
      ResumePayment: {
        type: 'object',
        required: ['orderId'],
        properties: {
          orderId: {
            type: 'string',
            description: 'Order _id or reference of an unpaid order',
            example: 'AST-XXXXXX',
          },
        },
      },
      SendOrderEmail: {
        type: 'object',
        required: ['emailType'],
        properties: {
          emailType: {
            type: 'string',
            description: 'Template to send',
            example: 'order-confirmation',
          },
        },
      },
    },
  },

  // ─────────────────────────────── Auth ────────────────────────────────────
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          ...jsonBody('UserRegistration', {
            name: 'Ada Obi',
            email: 'ada@example.com',
            password: 'secret-password',
            phone: '+2348000000000',
          }),
        },
        responses: enriched(ok('User created; verification OTP is emailed'), errors),
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        requestBody: { required: true, ...jsonBody('UserLogin', { email: 'ada@example.com', password: 'secret-password' }) },
        responses: enriched(ok('Returns a JWT token and the logged-in user'), errors),
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out the current session',
        security: bearer,
        responses: enriched(ok('Session logged out'), errors),
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current logged-in user',
        security: bearer,
        responses: enriched(ok('Returns the authenticated user profile'), errors),
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify an email address with the OTP sent at registration',
        requestBody: {
          required: true,
          ...jsonBody('VerifyEmail', { email: 'ada@example.com', otp: '123456' }),
        },
        responses: enriched(ok('Email verified; account activated'), errors),
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Resend the email verification OTP',
        requestBody: { required: true, ...jsonBody('ResendVerification', { email: 'ada@example.com' }) },
        responses: enriched(ok('A new OTP was sent'), errors),
      },
    },
    '/auth/password/reset-request': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset (emails a 6-digit OTP)',
        requestBody: { required: true, ...jsonBody('PasswordResetRequest', { email: 'ada@example.com' }) },
        responses: enriched(ok('Reset OTP emailed'), errors),
      },
    },
    '/auth/password/reset': {
      post: {
        tags: ['Auth'],
        summary: 'Reset the password with OTP + new password',
        requestBody: {
          required: true,
          ...jsonBody('PasswordReset', { email: 'ada@example.com', otp: '123456', password: 'new-password' }),
        },
        responses: enriched(ok('Password updated'), errors),
      },
    },
    '/auth/password/change': {
      post: {
        tags: ['Auth'],
        summary: 'Change the password for an authenticated user',
        security: bearer,
        requestBody: {
          required: true,
          ...jsonBody('ChangePassword', { currentPassword: 'old-password', newPassword: 'new-password' }),
        },
        responses: enriched(ok('Password updated'), errors),
      },
    },

    // ───────────────────────────── Products ────────────────────────────────
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products with filtering, sorting and pagination',
        parameters: [
          { name: 'category', in: 'query', description: 'Filter by category id', schema: { type: 'string' } },
          { name: 'q', in: 'query', description: 'Search by name/description', schema: { type: 'string' } },
          { name: 'featured', in: 'query', description: 'Only featured products', schema: { type: 'boolean' } },
          { name: 'sort', in: 'query', description: 'Sort field (e.g. price, -createdAt)', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: enriched(ok('Paginated list of products'), errors),
      },
    },
    '/products/featured': {
      get: {
        tags: ['Products'],
        summary: 'Get featured products',
        responses: enriched(ok('List of featured products'), errors),
      },
    },
    '/products/{slug}': {
      get: {
        tags: ['Products'],
        summary: 'Get a single product by slug or ID',
        parameters: [pathParam('slug', 'Product slug or _id')],
        responses: enriched(ok('The requested product'), { ...errors, 404: NotFound }),
      },
    },
    '/admin/products': {
      post: {
        tags: ['Products'],
        summary: 'Create a product (admin)',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': { example: { name: 'Product name', price: 5000, category: 'electronics' } },
          },
        },
        responses: enriched(ok('Product created'), errors),
      },
    },
    '/admin/products/migrate-images': {
      post: {
        tags: ['Products'],
        summary: 'Migrate legacy `/images/...` image paths to bare filenames (admin)',
        security: bearer,
        responses: enriched(ok('Image paths migrated; returns the updated product count'), errors),
      },
    },
    '/admin/products/{id}': {
      patch: {
        tags: ['Products'],
        summary: 'Update a product (admin)',
        security: bearer,
        parameters: [pathParam('id', 'Product ID')],
        requestBody: {
          content: { 'application/json': { example: { price: 5499, inStock: true } } },
        },
        responses: enriched(ok('Product updated'), { ...errors, 404: NotFound }),
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete a product (admin)',
        security: bearer,
        parameters: [pathParam('id', 'Product ID')],
        responses: enriched(ok('Product deleted'), { ...errors, 404: NotFound }),
      },
    },

    // ────────────────────────────── Orders ─────────────────────────────────
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: 'Get the current user’s orders',
        security: bearer,
        responses: enriched(ok('List of the user’s orders'), errors),
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get an order by reference or _id (owner or admin)',
        security: bearer,
        parameters: [pathParam('id', 'Order reference (AST-…) or _id')],
        responses: enriched(ok('The requested order'), { ...errors, 404: NotFound }),
      },
    },
    '/orders/{id}/address': {
      patch: {
        tags: ['Orders'],
        summary: 'Update the shipping address of the user’s own unpaid order',
        security: bearer,
        parameters: [pathParam('id', 'Order reference (AST-…) or _id')],
        requestBody: {
          content: { 'application/json': { example: { address: '12 Broad Street, Lagos' } } },
        },
        responses: enriched(ok('Address updated'), errors),
      },
    },
    '/orders/admin/all': {
      get: {
        tags: ['Orders'],
        summary: 'Get all orders (admin)',
        security: bearer,
        responses: enriched(ok('List of all orders'), errors),
      },
    },
    '/orders/admin/{id}/status': {
      patch: {
        tags: ['Orders'],
        summary: 'Update order status (admin)',
        security: bearer,
        parameters: [pathParam('id', 'Order ID')],
        requestBody: {
          content: { 'application/json': { example: { status: 'shipped' } } },
        },
        responses: enriched(ok('Order status updated'), errors),
      },
    },
    '/orders/admin/{id}/send-email': {
      post: {
        tags: ['Orders'],
        summary: 'Resend / trigger a specific email for an order (admin)',
        security: bearer,
        parameters: [pathParam('id', 'Order ID')],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SendOrderEmail' },
            },
          },
        },
        responses: enriched(ok('Email sent'), errors),
      },
    },
    '/orders/admin/{id}': {
      delete: {
        tags: ['Orders'],
        summary: 'Delete an unpaid order (admin, within 2 hours of creation)',
        security: bearer,
        parameters: [pathParam('id', 'Order ID')],
        responses: enriched(ok('Order deleted'), errors),
      },
    },

    // ────────────────────────────── Payments ───────────────────────────────
    '/payments/initialize': {
      post: {
        tags: ['Payments'],
        summary: 'Initialize a Paystack payment from cart contents',
        security: bearer,
        requestBody: {
          required: true,
          ...jsonBody('InitializePayment', {
            email: 'ada@example.com',
            currency: 'NGN',
            items: [{ product: '649f0c…', qty: 1 }],
            shipping: { name: 'Ada Obi', phone: '+2348000000000', address: '12 Broad Street, Lagos', city: 'Lagos', state: 'Lagos', country: 'Nigeria' },
            idempotencyKey: '7f0b27e1-…',
          }),
        },
        responses: enriched(ok('Returns Paystack authorization_url, reference and public key'), errors),
      },
    },
    '/payments/resume': {
      post: {
        tags: ['Payments'],
        summary: 'Resume an existing payment session for an unpaid order (reuses the original reference)',
        security: bearer,
        requestBody: {
          required: true,
          ...jsonBody('ResumePayment', { orderId: 'AST-XXXXXX' }),
        },
        responses: enriched(ok('Returns a fresh authorization_url for the existing reference'), errors),
      },
    },
    '/payments/verify/{reference}': {
      get: {
        tags: ['Payments'],
        summary: 'Verify a payment against Paystack and sync its status',
        security: bearer,
        parameters: [pathParam('reference', 'Paystack transaction reference')],
        responses: enriched(ok('Returns the settled/synced payment and order state'), errors),
      },
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Paystack webhook (raw JSON body, signature-verified)',
        responses: enriched(ok('Acknowledged'), errors),
      },
    },

    // ─────────────────────────── Transactions ──────────────────────────────
    '/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'Get transactions for the current user',
        security: bearer,
        responses: enriched(ok('List of the user’s transactions'), errors),
      },
    },
    '/transactions/{ref}': {
      get: {
        tags: ['Transactions'],
        summary: 'Get a transaction by reference',
        security: bearer,
        parameters: [pathParam('ref', 'Transaction reference')],
        responses: enriched(ok('The requested transaction'), { ...errors, 404: NotFound }),
      },
    },
    '/transactions/admin/all': {
      get: {
        tags: ['Transactions'],
        summary: 'Get all transactions (admin)',
        security: bearer,
        responses: enriched(ok('List of all transactions'), errors),
      },
    },
    '/admin/transactions/sync': {
      post: {
        tags: ['Transactions'],
        summary: 'Reconcile unsettled transactions against Paystack (admin)',
        security: bearer,
        responses: enriched(ok('Summary of transactions scanned, settled, failed and errored'), errors),
      },
    },

    // ─────────────────────────────── Admin ─────────────────────────────────
    '/admin/customers': {
      get: {
        tags: ['Admin'],
        summary: 'Get all customers (admin)',
        security: bearer,
        responses: enriched(ok('List of customers'), errors),
      },
    },
    '/admin/customers/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get a customer by ID (admin)',
        security: bearer,
        parameters: [pathParam('id', 'Customer/user ID')],
        responses: enriched(ok('The requested customer'), { ...errors, 404: NotFound }),
      },
    },
    '/admin/analytics': {
      get: {
        tags: ['Admin'],
        summary: 'Get dashboard analytics (admin)',
        security: bearer,
        responses: enriched(ok('Sales, orders and revenue metrics'), errors),
      },
    },
    '/admin/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'Get audit logs (admin)',
        security: bearer,
        responses: enriched(ok('List of audit log entries'), errors),
      },
    },
    '/admin/maintenance/seed-demo': {
      post: {
        tags: ['Admin'],
        summary: 'Seed the default admin + demo catalogue (admin, opt-in)',
        security: bearer,
        responses: enriched(ok('Demo data seeded'), errors),
      },
    },

    // ─────────────────────────────── Fraud ─────────────────────────────────
    '/fraud/alerts': {
      get: {
        tags: ['Fraud'],
        summary: 'Get fraud alerts (admin)',
        security: bearer,
        responses: enriched(ok('List of fraud alerts'), errors),
      },
    },
    '/fraud/alerts/{id}': {
      get: {
        tags: ['Fraud'],
        summary: 'Get a fraud alert by ID (admin)',
        security: bearer,
        parameters: [pathParam('id', 'Fraud alert ID')],
        responses: enriched(ok('The requested fraud alert'), { ...errors, 404: NotFound }),
      },
      patch: {
        tags: ['Fraud'],
        summary: 'Update a fraud alert (admin)',
        security: bearer,
        parameters: [pathParam('id', 'Fraud alert ID')],
        requestBody: {
          content: {
            'application/json': {
              example: { status: 'reviewed', riskScore: 75 },
            },
          },
        },
        responses: enriched(ok('Fraud alert updated'), errors),
      },
    },
  },
};

export default swaggerSpec;