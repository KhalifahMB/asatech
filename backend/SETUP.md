# ASATECH Backend Setup Guide

## Quick Start

### 1. Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **MongoDB** - Local installation or MongoDB Atlas
- **npm** or **yarn**

### 2. Installation

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
# Required: MONGODB_URI, JWT_SECRET, PAYSTACK keys
```

### 3. Database Setup

#### Option A: Local MongoDB
```bash
# Install MongoDB locally
# macOS: brew install mongodb-community
# Ubuntu: sudo apt-get install mongodb
# Windows: Download from mongodb.com

# Start MongoDB
mongod

# Run seed script
npm run seed
```

#### Option B: MongoDB Atlas (Recommended for Production)
1. Create account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

```
mongodb+srv://<username>:<password>@cluster.mongodb.net/asatech?retryWrites=true&w=majority
```

### 4. Seed Database

```bash
# Create admin user and demo products
npm run seed
```

**Default Admin Credentials:**
- Email: `admin@asatech.ng`
- Password: `As@Tech2026!SecureAdmin#`

⚠️ **Change the admin password immediately in production!**

### 5. Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on: `http://localhost:8080`

### 6. Verify Installation

```bash
# Health check
curl http://localhost:8080/health

# API documentation
open http://localhost:8080/api/v1/docs
```

## Configuration

### Required Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/asatech

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxx
```

### Optional Environment Variables

```bash
# Email (for password reset, order confirmations)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=ASATECH <noreply@asatech.ng>

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Paystack Setup

1. Create account at [paystack.com](https://paystack.com)
2. Go to Settings → API Keys
3. Copy test keys for development
4. Configure webhook URL: `https://your-domain.com/api/v1/payments/webhook`
5. Copy webhook secret

### Test Cards

| Card Number | Type | PIN |
|-------------|------|-----|
| 4084 0840 8408 4080 | Visa | 1234 |
| 5555 5555 5555 4444 | Mastercard | 1234 |

## API Documentation

Swagger UI available at: `http://localhost:8080/api/v1/docs`

### Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | - | Register user |
| POST | /auth/login | - | User login |
| GET | /products | - | List products |
| POST | /payments/initialize | ✓ | Initialize payment |
| GET | /orders | ✓ | User orders |
| GET | /admin/analytics | Admin | Dashboard stats |

## Docker Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Environment Variables for Docker

Create `.env` file in backend directory:

```bash
JWT_SECRET=your-production-secret
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxx
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Production Deployment

### Railway.app

1. Connect GitHub repository
2. Add environment variables
3. Add start command: `npm start`
4. Deploy

### Render.com

1. Create Web Service
2. Connect repository
3. Build: `npm install`
4. Start: `npm start`
5. Add environment variables

### Manual VPS

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Clone and setup
git clone <repository>
cd backend
npm install --production
npm run seed

# Start with PM2
pm2 start src/app.js --name asatech-api
pm2 save
pm2 startup
```

## Troubleshooting

### MongoDB Connection Failed
```bash
# Check MongoDB is running
mongosh

# Verify connection string
echo $MONGODB_URI
```

### Port Already in Use
```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3000
```

### Paystack Initialization Fails
- Verify secret key is correct
- Check network connectivity
- Review Paystack dashboard for errors

### Email Not Sending
- Use app password for Gmail (not regular password)
- Enable "Less secure app access" (Gmail)
- Check SMTP settings

## Security Checklist

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET
- [ ] Use production Paystack keys
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up webhook signature verification
- [ ] Enable rate limiting
- [ ] Review audit logs regularly

## Support

For issues:
1. Check logs: `logs/combined.log`, `logs/error.log`
2. Review API documentation
3. Check Paystack dashboard
4. Contact: support@asatech.ng

## License

PROPRIETARY - ASATECH
