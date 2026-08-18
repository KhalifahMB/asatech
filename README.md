# ASATECH — Premium Gadgets E-Commerce Platform

Full-stack e-commerce platform for premium electronics and gadgets, with
integrated Paystack payments, real-time fraud detection, and an
administrative console for orders, inventory, and risk investigation.

## Repository Layout

```
asatech/
├── frontend/                 # Frontend documentation & env template
│   ├── README.md             # Frontend-specific documentation
│   └── .env.example          # Frontend environment template
├── backend/                  # Express + MongoDB API
│   ├── src/                  # Source code
│   ├── scripts/seed.js       # Database seeding
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── src/                      # Frontend source code (Vite build root)
├── public/                   # Frontend static assets
├── docs/                     # Cross-cutting documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── PAYMENT.md
│   ├── DEPLOYMENT.md
│   └── SECURITY.md
├── index.html                # Frontend HTML entry
├── package.json              # Frontend dependencies
├── vite.config.ts            # Vite build configuration
├── docker-compose.yml        # Orchestrates MongoDB + backend + frontend
├── .env.example              # Root environment template (frontend + shared)
├── .gitignore
└── README.md                 # This file
```

> **Why is the frontend source at the root?** Vite expects `index.html`,
> `package.json`, and `vite.config.ts` at the project root by convention. The
> `frontend/` folder holds the frontend-specific docs and env template. When
> you deploy the frontend, the repository root is the frontend build root.

## Tech Stack

**Frontend**
- React 19, Vite 7, JavaScript
- Tailwind CSS v4, Material UI, Lucide React
- React Router v6

**Backend**
- Node.js 20 LTS, Express 4
- MongoDB 7 + Mongoose 8
- JWT authentication, bcrypt password hashing
- Paystack for payments
- Nodemailer for transactional email
- Helmet, CORS, express-rate-limit, express-mongo-sanitize, HPP

## Quick Start

### Option 1 — Docker (fastest)

```bash
# 1. Copy env templates
cp .env.example .env
cp backend/.env.example backend/.env

# 2. Edit backend/.env — set JWT_SECRET, PAYSTACK_SECRET_KEY, etc.
# 3. Edit .env — set VITE_PAYSTACK_PUBLIC_KEY

# 4. Start everything (MongoDB + backend + frontend)
docker compose up -d

# 5. Seed the database (first run only)
docker compose exec backend npm run seed
```

Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080/api/v1
- API Docs: http://localhost:8080/api/v1/docs
- MongoDB: localhost:27017

### Option 2 — Local development

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, PAYSTACK keys
npm run seed        # Seeds admin user and demo products
npm run dev         # Starts on port 8080
```

**Frontend (in another terminal, from the repository root):**
```bash
npm install
cp frontend/.env.example .env
# Edit .env — set VITE_API_BASE_URL and VITE_PAYSTACK_PUBLIC_KEY
npm run dev         # Starts on port 5173
```

## Environment Configuration

Two `.env` files are required:

| File | Purpose | Contains |
|------|---------|----------|
| `.env` (root) | Frontend | `VITE_API_BASE_URL`, `VITE_PAYSTACK_PUBLIC_KEY` |
| `backend/.env` | Backend | `MONGODB_URI`, `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `EMAIL_*`, `FRONTEND_URL` |

See the respective `.env.example` files and the `docs/` folder for details.

## First-Run Admin Credentials

After running `npm run seed` (or `docker compose exec backend npm run seed`),
sign in with the seeded admin account defined by `ADMIN_EMAIL` and
`ADMIN_PASSWORD` in `backend/.env`.

Defaults (change immediately in production):
```
Email:    admin@asatech.ng
Password: As@Tech2026!SecureAdmin#
```

## Features

### Customer
- Product catalogue with search, filtering, sorting
- Product details with image gallery and specifications
- Cart with quantity management and free-shipping threshold
- Multi-step checkout (auth-protected) with Paystack integration
- Account dashboard: orders, transactions, wishlist, security
- Order tracking timeline
- Dark / light theme

### Admin
- KPI dashboard with revenue, transaction & risk analytics
- Product & inventory management
- Order management with status updates
- Customer directory
- Payment transaction monitoring
- **Fraud alert investigation** with risk score, factors, decision controls
- Audit logs
- Real-time risk scoring on every payment

### Security & Payment
- JWT authentication with account lockout after failed attempts
- Password hashing with bcrypt (12 rounds)
- Rate limiting on all endpoints (stricter on auth & payment)
- Paystack webhook signature verification (HMAC-SHA512, constant-time)
- Server-authoritative pricing (client cannot tamper with totals)
- Idempotent payment processing
- Amount-mismatch guard on webhook
- Rules-based fraud scoring (0-100)
- Full audit trail

## Fraud Risk Levels

| Level | Score | Meaning |
|-------|-------|---------|
| Low | 0–29 | Normal transaction, auto-approved |
| Medium | 30–59 | Elevated risk, monitored |
| High | 60–100 | Alert raised, admin notified |

Risk factors scored server-side:
- High-value purchase (≥ ₦500,000): +30
- Multiple purchases in 24h (≥ 5): +25
- New/unrecognised device: +20
- Failed login attempts (≥ 3): +15
- Unusual purchasing hours (02:00–05:00): +10

## API Endpoints (Summary)

The backend exposes a RESTful JSON API at `/api/v1/*`. Every response uses
the envelope `{ success, data, error? }`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | – | Register a customer |
| POST | `/auth/login` | – | Sign in |
| GET | `/auth/me` | ✅ | Current user + stats |
| GET | `/products` | – | List/filter/paginate products |
| GET | `/products/:slug` | – | Product details |
| POST | `/payments/initialize` | ✅ | Initialise a Paystack transaction |
| POST | `/payments/webhook` | – (signed) | Paystack webhook receiver |
| GET | `/orders` | ✅ | Current user's orders |
| GET | `/orders/:ref` | ✅ | Order details |
| GET | `/orders/admin/all` | 👤 admin | All orders |
| GET | `/transactions` | ✅ | Current user's transactions |
| GET | `/fraud/alerts` | 👤 admin | Fraud alerts |
| PATCH | `/fraud/alerts/:id` | 👤 admin | Update alert |
| GET | `/admin/analytics` | 👤 admin | Dashboard analytics |
| GET | `/admin/customers` | 👤 admin | Customer directory |
| GET | `/admin/audit-logs` | 👤 admin | Audit trail |
| POST/PATCH/DELETE | `/admin/products/:id?` | 👤 admin | Product management |

Full specification: `docs/API.md` and live Swagger UI at
`http://localhost:8080/api/v1/docs`.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Frontend architecture
- [`docs/API.md`](docs/API.md) — API endpoint specification
- [`docs/PAYMENT.md`](docs/PAYMENT.md) — Paystack integration guide
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Deployment instructions
- [`docs/SECURITY.md`](docs/SECURITY.md) — Security notes
- [`backend/README.md`](backend/README.md) — Backend documentation
- [`backend/SETUP.md`](backend/SETUP.md) — Backend setup guide
- [`frontend/README.md`](frontend/README.md) — Frontend documentation

## Testing

**Manual checklist:**
- Register → auto-login → account dashboard
- Add products to cart → checkout (auth required) → Paystack popup
- Admin login → dashboard → manage products / orders / fraud alerts
- Dark/light theme toggle persists across reloads
- Mobile responsive layouts

## Production Deployment

### Deployment Architecture

```
                 ┌────────────────┐
                 │  Cloudflare/   │
                 │  CDN + WAF     │
                 └───────┬────────┘
                         │
      ┌──────────────────┴──────────────────┐
      │                                     │
┌─────▼─────┐                       ┌───────▼──────┐
│  Static   │                       │   Node.js    │
│  Frontend │  ─── API calls ────►  │  Backend     │
│  (Vercel/ │                       │  (Railway/   │
│  Netlify) │                       │   Render)    │
└───────────┘                       └───────┬──────┘
                                            │
                                    ┌───────▼──────┐
                                    │   MongoDB    │
                                    │   Atlas      │
                                    └──────────────┘
```

### Recommended Hosting

- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Backend**: Railway, Render, Fly.io, or a VPS
- **Database**: MongoDB Atlas (free tier suits development)
- **Email**: SendGrid, Mailgun, or Amazon SES (via SMTP)

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for detailed steps.

## Security Highlights

- Payment secret keys **only** on the backend
- HMAC signature verification on webhooks
- Server-authoritative pricing prevents client tampering
- Idempotent payment handling (safe against duplicate webhooks)
- Amount validation between webhook and expected total
- Automatic account lockout after 5 failed login attempts
- Password reset tokens stored **hashed** in the database
- Constant-time signature comparison to prevent timing attacks
- Rate limits on authentication and payment endpoints
- MongoDB operator injection filtered (`express-mongo-sanitize`)
- HTTP Parameter Pollution guarded (`hpp`)
- Helmet security headers
- Strict CORS with configurable allow-list

See [`docs/SECURITY.md`](docs/SECURITY.md) for details.

## Contributing

1. Create a feature branch
2. Make changes with clear commits
3. Test locally (both frontend and backend)
4. Open a pull request

## License

PROPRIETARY — © ASATECH. All rights reserved.
