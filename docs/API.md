# ASATECH API Specification

This document defines the expected backend API endpoints for the ASATECH frontend integration.

## Base Configuration

```
Base URL: {VITE_API_BASE_URL}
Content-Type: application/json
Authentication: Bearer token (Authorization header)
```

## Authentication

### POST /auth/login
Authenticate a user.

**Request**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200)**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "usr-xxx",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

### POST /auth/register
Create a new user account.

**Request**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (201)**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "usr-xxx",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

### GET /auth/me
Get current authenticated user.

**Headers**
```
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "id": "usr-xxx",
  "name": "John Doe",
  "email": "user@example.com",
  "role": "customer",
  "phone": "+234 xxx xxx xxxx"
}
```

### POST /auth/password/reset-request
Request a password reset email.

**Request**
```json
{
  "email": "user@example.com"
}
```

**Response (200)**
```json
{
  "ok": true
}
```

### POST /auth/password/reset
Reset password with token.

**Request**
```json
{
  "token": "reset_token_from_email",
  "password": "newSecurePassword"
}
```

**Response (200)**
```json
{
  "ok": true
}
```

### POST /auth/logout
Invalidate the current session.

**Headers**
```
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "ok": true
}
```

---

## Products

### GET /products
List all products with optional filtering.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name or description |
| category | string | Filter by category ID |
| minPrice | number | Minimum price filter |
| maxPrice | number | Maximum price filter |
| inStock | boolean | Filter to in-stock items only |
| sort | string | Sort: featured, price-asc, price-desc, rating, deals |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 12) |

**Response (200)**
```json
{
  "data": [...products],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 12,
    "pages": 9
  }
}
```

### GET /products/:slug
Get a single product by slug.

**Response (200)**
```json
{
  "id": "p-xxx",
  "slug": "aurora-x1-pro",
  "name": "Aurora X1 Pro 5G",
  "category": "smartphones",
  "price": 1250000,
  "previousPrice": 1400000,
  "stock": 18,
  "rating": 4.8,
  "ratingCount": 214,
  "badge": "Best Seller",
  "featured": true,
  "images": ["url1", "url2"],
  "short": "Brief description",
  "description": "Full description",
  "specs": [
    { "label": "Display", "value": "6.7\" AMOLED" },
    { "label": "Storage", "value": "256 GB" }
  ]
}
```

### GET /products/featured
Get featured products.

**Response (200)**
```json
{
  "data": [...products]
}
```

---

## Orders

### GET /orders
List orders (customer sees own, admin sees all).

**Query Parameters (Admin)**
| Parameter | Type | Description |
|-----------|------|-------------|
| customerId | string | Filter by customer |
| status | string | Filter by order status |
| search | string | Search by order ref or customer name |

**Response (200)**
```json
{
  "data": [
    {
      "id": "ord-xxx",
      "ref": "AST-ABC123",
      "customerId": "usr-xxx",
      "customerName": "John Doe",
      "date": "2026-01-15T10:30:00Z",
      "items": [
        {
          "productId": "p-xxx",
          "name": "Product Name",
          "image": "url",
          "price": 100000,
          "quantity": 2
        }
      ],
      "subtotal": 200000,
      "shipping": 2500,
      "total": 202500,
      "paymentStatus": "paid",
      "orderStatus": "delivered",
      "riskScore": 12,
      "riskLevel": "low",
      "paymentRef": "PSK-XXX",
      "shippingAddress": {
        "name": "John Doe",
        "line1": "14 Admiralty Way",
        "city": "Lagos",
        "state": "Lagos",
        "phone": "+234 xxx xxx xxxx"
      },
      "timeline": [
        { "step": "placed", "at": "2026-01-15T10:30:00Z", "done": true },
        { "step": "paid", "at": "2026-01-15T10:32:00Z", "done": true }
      ]
    }
  ]
}
```

### GET /orders/:ref
Get order details by reference.

**Response (200)**
```json
{
  "id": "ord-xxx",
  "ref": "AST-ABC123",
  ... (full order object)
}
```

---

## Transactions

### GET /transactions
List payment transactions.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| customerId | string | Filter by customer |
| status | string | Filter by status |
| search | string | Search by reference |

**Response (200)**
```json
{
  "data": [
    {
      "id": "txn-xxx",
      "reference": "PSK-ABC123",
      "orderRef": "AST-ABC123",
      "orderId": "ord-xxx",
      "customerId": "usr-xxx",
      "customerName": "John Doe",
      "date": "2026-01-15T10:32:00Z",
      "amount": 202500,
      "status": "successful",
      "channel": "card",
      "riskScore": 12,
      "riskLevel": "low",
      "method": "Paystack"
    }
  ]
}
```

### GET /transactions/:ref
Get transaction details.

**Response (200)**
```json
{
  "id": "txn-xxx",
  ... (full transaction object)
}
```

---

## Payments

### POST /payments/initialize
**CRITICAL ENDPOINT** — Initialize a Paystack payment transaction.

**Request**
```json
{
  "email": "customer@example.com",
  "amount": 202500,
  "currency": "NGN",
  "items": [
    { "productId": "p-xxx", "quantity": 2 }
  ],
  "shipping": {
    "name": "John Doe",
    "line1": "14 Admiralty Way",
    "city": "Lagos",
    "state": "Lagos",
    "phone": "+234 xxx xxx xxxx"
  }
}
```

**Response (200)**
```json
{
  "reference": "PSK-ABC123XYZ",
  "amount": 20250000,
  "currency": "NGN",
  "authorizationUrl": "https://checkout.paystack.com/PSK-ABC123XYZ",
  "accessCode": "abc123xyz",
  "metadata": {
    "orderId": "ord-xxx",
    "customerEmail": "customer@example.com"
  }
}
```

**Frontend Usage**
```javascript
// 1. Initialize payment
const init = await initializePayment({ email, amount, items, shipping });

// 2. Launch Paystack popup
launchPaystack(
  {
    key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    email: init.email,
    amount: init.amount, // in kobo
    reference: init.reference,
    currency: init.currency,
    metadata: init.metadata
  },
  {
    onSuccess: (response) => {
      // Payment completed — backend verifies
      // Navigate to confirmation
    },
    onClose: () => {
      // User closed popup
    },
    onError: (err) => {
      // Payment error
    }
  }
);
```

**Important Notes**
- Amount is in **kobo** (multiply Naira by 100)
- Payment **verification happens server-side only**
- Frontend receives confirmation after backend verifies with Paystack
- Never expose Paystack secret key in frontend

---

## Fraud

### GET /fraud/alerts
List fraud alerts (admin only).

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| severity | string | Filter by severity |
| search | string | Search by customer or reference |

**Response (200)**
```json
{
  "data": [
    {
      "id": "fa-xxx",
      "severity": "high",
      "riskScore": 77,
      "txnRef": "PSK-ABC123",
      "orderRef": "AST-ABC123",
      "customerName": "John Doe",
      "createdAt": "2026-02-03T11:20:00Z",
      "status": "new",
      "amount": 4250000,
      "factors": [
        "High-value purchase",
        "New or unrecognized device",
        "Multiple purchases in a short period"
      ]
    }
  ]
}
```

### GET /fraud/alerts/:id
Get fraud alert details.

**Response (200)**
```json
{
  "id": "fa-xxx",
  ... (full alert object)
}
```

### PATCH /fraud/alerts/:id
Update fraud alert status.

**Request**
```json
{
  "status": "under-review"
}
```

**Response (200)**
```json
{
  "id": "fa-xxx",
  "status": "under-review",
  ... (updated alert object)
}
```

---

## Admin

### GET /admin/customers
List customers (admin only).

**Response (200)**
```json
{
  "data": [
    {
      "id": "usr-xxx",
      "name": "John Doe",
      "email": "user@example.com",
      "phone": "+234 xxx xxx xxxx",
      "joined": "2025-06-15T00:00:00Z",
      "orders": 5,
      "totalSpent": 1250000,
      "status": "active"
    }
  ]
}
```

### GET /admin/customers/:id
Get customer details.

**Response (200)**
```json
{
  "id": "usr-xxx",
  ... (full customer object with order history)
}
```

### GET /admin/audit-logs
List audit logs (admin only).

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| action | string | Filter by action type |
| actor | string | Filter by actor |
| search | string | Search logs |

**Response (200)**
```json
{
  "data": [
    {
      "id": "al-xxx",
      "timestamp": "2026-02-04T09:12:00Z",
      "actor": "Chidi Nwosu",
      "actorRole": "admin",
      "action": "Order status updated",
      "resource": "AST-10A5",
      "status": "success",
      "detail": "Changed order status from processing to shipped"
    }
  ]
}
```

### GET /admin/analytics
Get dashboard analytics (admin only).

**Response (200)**
```json
{
  "revenueSeries": [
    { "label": "Aug", "value": 12.4 },
    { "label": "Sep", "value": 14.1 }
  ],
  "transactionsSeries": [
    { "label": "Aug", "value": 210 },
    { "label": "Sep", "value": 246 }
  ],
  "riskDistribution": [
    { "label": "Low", "value": 78, "color": "#10b981" },
    { "label": "Medium", "value": 16, "color": "#f59e0b" },
    { "label": "High", "value": 6, "color": "#ef4444" }
  ],
  "categorySales": [
    { "label": "Smartphones", "value": 42 },
    { "label": "Laptops", "value": 26 }
  ]
}
```

### POST /admin/products
Create a product (admin only).

**Request**
```json
{
  "name": "New Product",
  "slug": "new-product",
  "category": "smartphones",
  "price": 500000,
  "previousPrice": null,
  "stock": 50,
  "short": "Brief description",
  "description": "Full description",
  "badge": "New",
  "images": ["url1", "url2"],
  "specs": [{ "label": "Spec", "value": "Value" }]
}
```

### PATCH /admin/products/:id
Update a product (admin only).

**Request**
```json
{
  "stock": 45,
  "price": 480000
}
```

### DELETE /admin/products/:id
Delete a product (admin only).

**Response (200)**
```json
{
  "ok": true
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

---

## Rate Limiting

Backend should implement rate limiting:
- Authentication endpoints: 10 requests/minute
- Product listing: 100 requests/minute
- Payment initialization: 20 requests/minute

Headers to include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```
