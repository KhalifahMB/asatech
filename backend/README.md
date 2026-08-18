# ASATECH Backend API

Production-ready Express.js + MongoDB backend for the ASATECH e-commerce platform.

## Features

- 🔐 JWT Authentication & Authorization
- 💳 Paystack Payment Integration
- 🛡️ Fraud Detection (Rules-based Scoring)
- 📧 Email Notifications (Nodemailer)
- 🔒 Security (Helmet, CORS, Rate Limiting, XSS Protection)
- 📊 API Documentation (Swagger/OpenAPI)
- 📝 Request Logging (Winston + Morgan)
- 🧪 Testing (Jest + Supertest)
- 🐳 Docker Support

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js 4.x |
| Database | MongoDB 7.x + Mongoose 8.x |
| Authentication | JWT (jsonwebtoken) |
| Payment | Paystack API |
| Email | Nodemailer (SMTP) |
| Security | Helmet, CORS, express-rate-limit, xss-clean |
| Logging | Winston + Morgan |
| Docs | Swagger UI |
| Testing | Jest + Supertest |

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repository-url>
cd asatech/backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
# - MONGODB_URI
# - JWT_SECRET
# - PAYSTACK_SECRET_KEY
# - EMAIL credentials

# Seed database
npm run seed

# Start development server
npm run dev
```

Server runs on `http://localhost:8080`

### API Documentation

Swagger UI available at: `http://localhost:8080/api-docs`

## Database Seeding

### Seed Default Data
```bash
npm run seed
```

Creates:
- Admin user (admin@asatech.ng)
- Product categories
- Sample products (optional with --demo flag)

### Seed with Demo Products
```bash
npm run seed:demo
```

## Environment Variables

See `.env.example` for all configuration options.

**Required:**
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing
- `PAYSTACK_SECRET_KEY` - Paystack secret key
- `PAYSTACK_PUBLIC_KEY` - Paystack public key

**Optional:**
- `EMAIL_*` - SMTP credentials for email notifications
- `FRONTEND_URL` - Frontend application URL (CORS)

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register new user |
| POST | /api/v1/auth/login | User login |
| POST | /api/v1/auth/logout | User logout |
| GET | /api/v1/auth/me | Current user |
| POST | /api/v1/auth/password/reset-request | Request password reset |
| POST | /api/v1/auth/password/reset | Reset password |

### Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/products | No | List products |
| GET | /api/v1/products/:slug | No | Product details |
| GET | /api/v1/products/featured | No | Featured products |
| POST | /api/v1/admin/products | Admin | Create product |
| PATCH | /api/v1/admin/products/:id | Admin | Update product |
| DELETE | /api/v1/admin/products/:id | Admin | Delete product |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/orders | Yes | List orders |
| GET | /api/v1/orders/:ref | Yes | Order details |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/payments/initialize | Yes | Initialize Paystack |
| POST | /api/v1/payments/webhook | No | Paystack webhook |

### Fraud (Admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/fraud/alerts | Admin | List fraud alerts |
| PATCH | /api/v1/fraud/alerts/:id | Admin | Update alert |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/admin/customers | Admin | List customers |
| GET | /api/v1/admin/audit-logs | Admin | Audit logs |
| GET | /api/v1/admin/analytics | Admin | Dashboard analytics |

## Payment Flow

1. Frontend sends checkout data to `POST /payments/initialize`
2. Backend creates Paystack transaction
3. Backend returns reference to frontend
4. Frontend launches Paystack popup
5. Paystack sends webhook to `POST /payments/webhook`
6. Backend verifies and updates order status

## Fraud Detection

Rules-based scoring system:
- High-value purchase (>₦500,000): +30 points
- Multiple purchases (5+ in 24h): +25 points
- New device (first login): +20 points
- Failed login attempts (3+): +15 points
- Unusual hours (2AM-5AM): +10 points

Risk Levels:
- Low: 0-29
- Medium: 30-59
- High: 60-100

## Security

- Password hashing: bcrypt (12 rounds)
- JWT tokens: 7-day expiration
- Rate limiting: 100 requests/15min
- Input sanitization: mongo-sanitize, xss-clean
- Headers: Helmet security headers
- CORS: Configured for frontend origin

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

## Deployment

### Railway.app

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Render.com

1. Create Web Service
2. Connect repository
3. Build command: `npm install`
4. Start command: `npm start`
5. Set environment variables

### Docker

```bash
# Build image
docker build -t asatech-backend .

# Run container
docker run -p 8080:8080 --env-file .env asatech-backend
```

## Monitoring

Logs written to `logs/` directory:
- `combined.log` - All requests
- `error.log` - Errors only
- `audit.log` - Audit trail

## License

PROPRIETARY - ASATECH
