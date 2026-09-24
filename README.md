# ASATECH E-Commerce Platform

ASATECH is a full-stack, production-ready e-commerce platform for premium gadgets (Nigeria). It combines a React storefront and admin console with a secure Express.js + MongoDB API, Paystack payment processing, and a rules-based fraud detection engine.

This monorepo contains everything needed to run the platform locally or deploy it to production.

## Repository Structure

```
asatech/
├── backend/            # Express.js + MongoDB REST API
│   ├── src/            # Controllers, models, routes, services, middleware
│   ├── scripts/        # Database seeding
│   ├── docker-compose.yml  # MongoDB + API local stack
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md       # Backend-specific docs (endpoints, env vars)
│
├── frontend/           # React 19 + Vite 7 single-page application
│   ├── src/            # Components, pages, layouts, services, state
│   ├── index.html
│   ├── vite.config.js / vite.config.ts
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md       # Frontend-specific docs (routing, env vars)
│
└── docs/               # Cross-cutting documentation
    ├── API.md          # REST API reference
    ├── ARCHITECTURE.md # Frontend architecture
    ├── DEPLOYMENT.md   # Production deployment guides
    ├── PAYMENT.md      # Paystack integration details
    ├── SECURITY.md     # Security model
    └── SECURITY_REVIEW.md
```

## Technology Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 19, Vite 7, Tailwind CSS v4, Material UI, React Router, Lucide |
| Backend    | Node.js 20, Express.js 4, Mongoose 8 |
| Database   | MongoDB 7 |
| Auth       | JWT (7-day tokens), bcrypt (12 rounds) |
| Payments   | Paystack (initialize → popup → webhook verification) |
| Email      | Brevo API (transactional) |
| Security   | Helmet, CORS, rate limiting, mongo-sanitize, hpp, CSP |
| Logging    | Winston + Morgan |
| API Docs   | Swagger UI / OpenAPI |

## Features

- **Storefront** — product catalogue with search/filter, product details, wishlist, and localStorage-persisted cart.
- **Checkout** — multi-step flow (cart → delivery → payment) with Paystack inline popup. Payment verification is server-side only.
- **Customer dashboard** — orders, transactions, profile & address book, wishlist, security settings.
- **Admin console** — analytics, product & inventory management, order management, customers, fraud alerts & investigation, audit logs.
- **Fraud detection** — rules-based risk scoring (high-value purchases, rapid repeat orders, new devices, failed logins, unusual hours) with Low/Medium/High risk levels.
- **Security** — JWT auth, role-based access (customer/admin), input sanitization, rate limits, security headers, audit logging.
- **Notifications** — transactional emails via Brevo.
- **API documentation** — live Swagger UI.

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 7 (local, Docker, or Atlas)
- npm

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then edit with your credentials
npm run seed           # creates admin user + sample catalogue
npm run dev            # http://localhost:8080
```

Swagger docs: `http://localhost:8080/api/v1/docs` — Health check: `http://localhost:8080/health`

Key `.env` values:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` | Paystack credentials |
| `PAYSTACK_WEBHOOK_SECRET` | Webhook signature verification |
| `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` | Transactional email |
| `FRONTEND_URL` | Frontend origin allowed by CORS |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded admin account |

Alternatively, run the backend + MongoDB with Docker:

```bash
cd backend
docker compose up --build
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL and VITE_PAYSTACK_PUBLIC_KEY
npm run dev            # http://localhost:5173
```

Frontend environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | ✅ | Backend API base URL, e.g. `http://localhost:8080/api/v1` |
| `VITE_PAYSTACK_PUBLIC_KEY` | ✅ for checkout | Paystack **public** key (`pk_test_…` / `pk_live_…`) |
| `VITE_APP_MODE` | – | `development` / `staging` / `production` |

> ⚠️ The Paystack **secret** key never touches the frontend — it stays on the backend where webhook verification happens.

## Main API Endpoints

All routes are prefixed `/api/v1`. See `docs/API.md` and the backend README for the full reference.

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password/reset-request`, `POST /auth/password/reset` |
| Products | `GET /products`, `GET /products/:slug`, `GET /products/featured` |
| Orders | `GET /orders`, `GET /orders/:ref` |
| Payments | `POST /payments/initialize`, `POST /payments/webhook` |
| Fraud (admin) | `GET /fraud/alerts`, `PATCH /fraud/alerts/:id` |
| Admin | `GET /admin/customers`, `GET /admin/audit-logs`, `GET /admin/analytics`, `GET/POST/PATCH/DELETE /admin/products` |

## Payment Flow

1. Checkout data is sent to `POST /payments/initialize`.
2. The backend creates a pending order, calculates the authoritative total, and returns a Paystack reference.
3. The frontend launches the Paystack inline popup.
4. Paystack processes the payment and fires a webhook to `POST /payments/webhook`.
5. The backend verifies the transaction with Paystack (server-side), marks the order paid, decrements stock, and sends a confirmation email.

Payment verification **never runs in the browser**.

## Fraud Detection

A rules-based scoring system flags suspicious behaviour for admin review:

| Rule | Points |
|------|--------|
| High-value purchase (> ₦500,000) | +30 |
| Multiple purchases (5+ in 24h) | +25 |
| New device (first login) | +20 |
| Failed login attempts (3+) | +15 |
| Unusual hours (2 AM – 5 AM) | +10 |

Risk levels: **Low** (0–29), **Medium** (30–59), **High** (60–100).

## Testing

A manual checklist for the core flows lives in `frontend/README.md` (browse, cart, checkout, Paystack popup, admin console, themes, responsiveness). Backend has `npm run lint` and a seed script for reproducible data.

## Deployment

- **Frontend** — `npm run build` produces a static bundle in `frontend/dist/`, deployable to Vercel, Netlify, Cloudflare Pages, S3 + CloudFront, or any static host (with SPA rewrite to `index.html`).
- **Backend** — deployable to Railway, Render, or any Node host; also ships a production Docker setup (`backend/docker-compose.yml` + `backend/Dockerfile`).

See `docs/DEPLOYMENT.md` for step-by-step instructions, environment-specific builds, and a post-deployment checklist.

## Documentation

| Document | Contents |
|----------|----------|
| `docs/API.md` | Full REST API reference |
| `docs/ARCHITECTURE.md` | Frontend architecture & design system |
| `docs/DEPLOYMENT.md` | Production deployment for both apps |
| `docs/PAYMENT.md` | Paystack integration deep-dive |
| `docs/SECURITY.md` / `docs/SECURITY_REVIEW.md` | Security model and review |

## License

PROPRIETARY — ASATECH. This repository is not open-sourced; do not redistribute without permission.