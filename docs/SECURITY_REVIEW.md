# Security & Code Review Summary

This document summarises the issues that were found and fixed during a
comprehensive review of both the frontend and backend codebases.

## 🔴 Critical Issues (Fixed)

### 1. Frontend — Missing Auth Token in HTTP Requests
**File:** `src/services/client.js`
**Impact:** All authenticated API calls would have failed with 401. Users
could log in but not fetch orders, place payments, or access the admin
console.
**Fix:** The HTTP client now reads the token from `localStorage` on every
request and attaches `Authorization: Bearer <token>`. It also handles 401
responses by clearing the local session so users are bounced back to
`/login` cleanly.

### 2. Backend — Broken `require()` in ES-Module Context
**File:** `backend/src/models/User.js`
**Issue:** `const crypto = require('crypto');` inside `generateResetToken`.
Since the backend uses `"type": "module"`, `require` is not defined —
password reset requests would crash the server.
**Fix:** Moved to a top-level `import crypto from 'crypto'`.

### 3. Backend — Password Reset Tokens Stored in Plain Text
**File:** `backend/src/models/User.js`, `backend/src/controllers/authController.js`
**Issue:** The model was storing the raw reset token, but the controller
looked up users by the SHA-256 hash of the incoming token. This meant
password resets could never succeed. Additionally, if it had worked, an
attacker with DB access could reuse plaintext tokens.
**Fix:** The model now hashes the token with SHA-256 before saving and
returns the raw token for emailing. The `passwordResetToken` and
`passwordResetExpires` fields are `select: false` so they never leak in
default queries.

### 4. Backend — Webhook Signature Verification Broken
**File:** `backend/src/controllers/paymentController.js`
**Issue:** `handleWebhook` computed the HMAC over `JSON.stringify(req.body)`,
but Express had already re-serialised the body. The webhook signature would
never match, so **every legitimate Paystack webhook would be rejected**.
Additionally, a typo (`verifyResponseResponse`) would crash the handler.
**Fix:**
- The webhook route now uses `express.raw()` so `req.body` is the exact
  bytes Paystack sent.
- Signature comparison uses `crypto.timingSafeEqual` to prevent timing
  attacks.
- Amount-mismatch check added: if Paystack reports a different amount than
  the pending transaction, the payment is rejected.
- Handler is idempotent — duplicate webhooks for the same transaction are
  ignored.

### 5. Backend — Server-Authoritative Pricing Missing
**File:** `backend/src/controllers/paymentController.js`
**Issue:** The initial implementation trusted the item prices sent by the
client. A malicious user could set the price of a ₦1M laptop to ₦1 and
pay ₦1.
**Fix:** The payment initializer now fetches the products from the database
by ID and uses the server's authoritative prices. It also validates stock
availability before creating the order.

## 🟠 High Severity (Fixed)

### 6. Backend — `audit()` Middleware Called Inside Controllers
**Files:** `productController.js`, `orderController.js`, `fraudController.js`
**Issue:** Controllers were invoking `audit('...', '...')(req, res, () => {})`
inline. This called the middleware factory but never let Express move on,
attached a redundant `res.json` override after the response was already
built, and duplicated audit entries.
**Fix:** Removed all inline calls. Where controller-level auditing is needed
(e.g. payment initialization) it now uses the `logAudit()` helper directly.
Route-level auditing continues to use the `audit()` middleware in
`routes/*.js`.

### 7. Backend — Deprecated `xss-clean` Package
**File:** `backend/src/app.js`, `backend/package.json`
**Issue:** `xss-clean` is deprecated and unmaintained (last release 2019).
Its regex-based sanitisation is easily bypassed and it mutates request
bodies in ways that can break legitimate inputs.
**Fix:** Removed entirely. XSS is prevented on the frontend by React's
default escaping, on the backend by JSON-only responses (no HTML rendering),
and by Helmet's `X-Content-Type-Options: nosniff` and CSP headers.

### 8. Backend — Weak/Default JWT Secret Accepted in Production
**File:** `backend/src/config/index.js`
**Issue:** The default `JWT_SECRET` was a string. If deployed with the
default, tokens could be forged.
**Fix:** Config now hard-fails on startup in production if `JWT_SECRET` is
missing, shorter than 32 characters, or matches any known weak default.

### 9. Backend — `req.ip` Untrusted Behind Proxies
**File:** `backend/src/app.js`
**Issue:** Behind a load balancer or reverse proxy, `req.ip` returns the
proxy's IP, so rate limiting and audit logging record the wrong address.
**Fix:** Added `app.set('trust proxy', 1)` in production (configurable via
`TRUST_PROXY`).

### 10. Frontend — Response Envelope Not Unwrapped
**File:** `src/services/client.js`
**Issue:** The backend returns `{ success, data, count, total, page, pages }`.
Frontend service code and pages expected the payload directly. Every list
would show 0 items.
**Fix:** The client transparently unwraps `data` and, for paginated arrays,
attaches `.meta` (`total`, `page`, `pages`, `count`) to the array so
components can read pagination info.

## 🟡 Medium Severity (Fixed)

### 11. Backend — Stock Decrement on Order Creation (Not Payment)
**File:** `backend/src/controllers/orderController.js`
**Issue:** A now-removed `createOrder` helper decremented stock immediately
when an order was created (still pending payment). Failed or abandoned
payments would leave stock incorrectly decremented.
**Fix:** Stock is now decremented only in `handleSuccessfulPayment` after
the payment is verified by Paystack.

### 12. Backend — `password_reset_expires` Set with Non-Number
**File:** `backend/src/models/User.js`
**Fix:** Uses `Date.now() + 60 * 60 * 1000` (1h), stored as a proper Date.
Also added `select: false` so it never accidentally appears in queries.

### 13. Backend — Password Field Not Excluded from JSON
**File:** `backend/src/models/User.js`
**Issue:** Although `password` had `select: false`, if the field was
explicitly selected (e.g. during login) the resulting user could accidentally
be serialised with the hash.
**Fix:** Added a `toJSON` transform that strips `password`,
`passwordResetToken`, `passwordResetExpires`, and `__v` from every JSON
serialisation.

### 14. Backend — Regex Query From Untrusted Input (ReDoS)
**File:** `backend/src/controllers/productController.js`
**Fix:** Search terms are now regex-escaped before being passed to
`$regex`. Prevents both ReDoS and injection.

### 15. Backend — Unbounded `limit` Query Parameter
**File:** `backend/src/controllers/productController.js`
**Fix:** `limit` is clamped to a maximum of 100. Sort values are validated
against an allow-list.

### 16. Backend — Loose ObjectId Lookup
**File:** `backend/src/controllers/productController.js`
**Issue:** Looking up products with `$or: [{ slug }, { _id: slug }]` when
`slug` isn't a valid ObjectId caused Mongoose CastErrors on every unknown
slug.
**Fix:** Only attempts `_id` lookup when the input matches the ObjectId
regex.

### 17. Backend — No Graceful Shutdown
**File:** `backend/src/app.js`
**Fix:** Added `SIGTERM`/`SIGINT` handlers that close the HTTP server
cleanly, plus `unhandledRejection`/`uncaughtException` handlers that log
and exit safely.

### 18. Backend — No Request Size Limit on Webhook
**File:** `backend/src/app.js`
**Fix:** Webhook body is limited to 1 MB; general JSON body limit reduced
from 10 MB to 1 MB.

### 19. Backend — Nested Order Route Conflict
**File:** `backend/src/routes/orders.js`
**Issue:** `router.use('/admin', ...)` combined with `router.get('/:ref')`
made `/orders/admin` resolve to `getOrder({ ref: 'admin' })`.
**Fix:** Reorganised to use explicit `/admin/all` and `/admin/:ref/status`
paths, declared before the `:ref` catch-all.

### 20. Frontend — Multiple Inputs Overlapping (UX)
**Files:** `pages/auth/Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`,
`ResetPassword.jsx`, `components/ui/Field.jsx`
**Issue:** MUI outlined `TextField`s stacked with `space-y-4` had their
floating labels clipped by the preceding field's border, as shown in the
user-provided screenshot.
**Fix:**
- Auth forms now use `flex flex-col gap-5` for more breathing room.
- The `Field` primitives use `margin="dense"` to add MUI's built-in vertical
  spacing that plays nicely with floating labels.

## 🟢 Low Severity (Fixed)

### 21. Backend — `handleFraudAlert` Emailed Admins Synchronously
**File:** `backend/src/controllers/paymentController.js`
**Fix:** Admin notifications now run in the background via `Promise.allSettled`
so a slow SMTP server doesn't block payment initialization.

### 22. Backend — CORS Allowed `*` in Some Configurations
**File:** `backend/src/app.js`
**Fix:** Restricted to `FRONTEND_URL` plus an optional comma-separated
`CORS_ORIGINS` allow-list. Requests without an Origin header (mobile apps,
server-to-server) still succeed as before.

### 23. Backend — Missing `x-powered-by` Removal
**File:** `backend/src/app.js`
**Fix:** `app.disable('x-powered-by')` so responses don't advertise Express.

### 24. Frontend — Cart & Wishlist localStorage Errors Not Caught
**Files:** `src/state/CartContext.jsx`, `src/state/wishlistStore.js`,
`src/services/authService.js`
**Fix:** All `localStorage` access is wrapped in try/catch so private-mode
browsers or storage quotas don't crash the app.

## Frontend Hardening

### Response handling
- Client automatically unwraps `{ success, data }` envelopes
- 401 responses trigger local session cleanup
- Network errors surface user-friendly messages (no stack traces)
- Aborted requests (page navigation) produce a distinct `ABORTED` code

### Route protection
- `RequireAuth` — used on `/checkout` and all `/account/*` routes
- `RequireAdmin` — used on all `/admin/*` routes
- These are UX-only gates. Backend enforces real authorization on every
  API call.

### Cart & wishlist
- Persisted to `localStorage` with defensive JSON parsing
- Cart totals are display-only — the backend recomputes them authoritatively
  at checkout

## Backend Hardening

### Rate limiting
| Endpoint group | Window | Max |
|---|---|---|
| `/api/v1/*` general | 15 min | 100 |
| `/api/v1/auth/*` | 15 min | 10 |
| `/api/v1/payments/initialize` | 5 min | 20 |
| `/api/v1/payments/webhook` | 1 min | 100 |

### Account protection
- 5 failed login attempts → account locked for 2 hours
- Password change or reset invalidates existing JWTs (via `passwordChangedAt`)
- All failed logins are audit-logged with IP + user-agent

### Input validation
- `express-mongo-sanitize` strips MongoDB operators (`$`, `.`) from bodies
- `hpp` prevents HTTP Parameter Pollution
- Mongoose schema validators enforce types, lengths and enums
- `validator` package validates emails and phone numbers

### Payment security
- Paystack **secret key never leaves the backend**
- Webhook signature verified with HMAC-SHA512, constant-time comparison
- Payment amount verified server-side against Paystack's response
- Duplicate webhook payloads are idempotent
- Order stock decrement is atomic and gated on payment success
- Refunded / cancelled transactions cannot re-enter successful state

### Fraud detection
- Rules-based scoring runs on every payment initialization
- Scores 60+ trigger a `FraudAlert` record and admin email
- Admin decisions on alerts are audit-logged

### Data protection
- Passwords hashed with bcrypt (12 rounds — configurable)
- Reset tokens hashed (SHA-256) before storage
- Reset tokens expire after 1 hour
- Sensitive fields (`password`, `passwordResetToken`) excluded from all
  JSON serialisations
- MongoDB connection uses timeouts and reconnect logic
- Graceful shutdown closes connections cleanly

## Recommended Post-Deployment Actions

- [ ] Rotate the seeded admin password immediately
- [ ] Generate a fresh `JWT_SECRET` (≥ 64 bytes)
- [ ] Configure `PAYSTACK_WEBHOOK_SECRET` in Paystack dashboard
- [ ] Point Paystack webhook URL to `https://<your-api>/api/v1/payments/webhook`
- [ ] Configure `EMAIL_*` for transactional email
- [ ] Set `CORS_ORIGINS` if serving multiple frontends
- [ ] Enable MongoDB Atlas IP allow-list
- [ ] Set up log aggregation (Winston → CloudWatch / Datadog / etc.)
- [ ] Configure uptime monitoring on `/health`
- [ ] Enable HTTPS everywhere (Paystack requires it in production)

## Ongoing Recommendations

- Add `snyk` or `npm audit` to CI
- Add rate-limit metrics to admin dashboard
- Rotate `JWT_SECRET` periodically (invalidates all sessions)
- Review audit logs weekly
- Load-test the payment initialization endpoint before high-traffic events
- Consider 2FA for admin accounts (backend endpoint stubbed for future work)
