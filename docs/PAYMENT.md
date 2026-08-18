# Payment Integration Guide

This document describes the Paystack payment integration for ASATECH.

## Overview

ASATECH uses Paystack for secure payment processing. The integration follows a server-mediated flow where:

1. **Frontend** collects checkout information
2. **Backend** initializes the Paystack transaction
3. **Frontend** launches Paystack popup
4. **Backend** verifies the payment
5. **Frontend** displays confirmation

## Security Principles

### DO
- ✅ Use Paystack **public key** only in frontend
- ✅ Initialize payments through backend endpoint
- ✅ Let backend verify payments server-side
- ✅ Handle payment callbacks gracefully
- ✅ Show clear payment states to users

### DON'T
- ❌ Never expose Paystack **secret key** in frontend
- ❌ Never verify payments in the browser
- ❌ Never trust payment success without backend confirmation
- ❌ Never store card details client-side
- ❌ Never mock payment success in production

## Integration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │   Paystack  │     │   Bank/     │
│             │     │   (API)     │     │             │     │   Card      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ 1. Checkout       │                   │                   │
       │    Complete       │                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │                   │ 2. Initialize     │                   │
       │                   │    Transaction    │                   │
       │                   │──────────────────>│                   │
       │                   │                   │                   │
       │                   │ 3. Return         │                   │
       │                   │    Reference      │                   │
       │                   │<──────────────────│                   │
       │                   │                   │                   │
       │ 4. Reference +    │                   │                   │
       │    Amount         │                   │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
       │ 5. Launch Popup   │                   │                   │
       │──────────────────────────────────────>│                   │
       │                   │                   │                   │
       │                   │                   │ 6. User enters    │
       │                   │                   │    card details   │
       │                   │                   │──────────────────>│
       │                   │                   │                   │
       │                   │                   │ 7. Process        │
       │                   │                   │    payment        │
       │                   │                   │<──────────────────│
       │                   │                   │                   │
       │ 8. Callback       │                   │                   │
       │<──────────────────────────────────────│                   │
       │                   │                   │                   │
       │ 9. Notify Backend │                   │                   │
       │    (verification) │                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │                   │ 10. Verify with   │                   │
       │                   │     Paystack API  │                   │
       │                   │──────────────────────────────────────>│
       │                   │                   │                   │
       │                   │ 11. Verification  │                   │
       │                   │     Result        │                   │
       │                   │<──────────────────────────────────────│
       │                   │                   │                   │
       │ 12. Order         │                   │                   │
       │     Confirmed     │                   │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
```

## Frontend Implementation

### 1. Checkout Form Collection

```javascript
// Checkout.jsx
const [delivery, setDelivery] = useState({
  name: "",
  email: "",
  phone: "",
  line1: "",
  city: "",
  state: ""
});
```

### 2. Payment Initialization

```javascript
// services/paymentService.js
export async function initializePayment(payload) {
  return client.post("/payments/initialize", payload);
}
```

```javascript
// Checkout.jsx
const init = await initializePayment({
  email: delivery.email,
  amount: total, // Backend converts to kobo
  currency: "NGN",
  items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
  shipping: { name: delivery.name, ...delivery }
});
```

### 3. Paystack Popup Launch

```javascript
// services/paymentService.js
export function launchPaystack(init, handlers = {}) {
  const { key, email, amount, reference, currency = "NGN", metadata } = init;
  
  const publicKey = key || config.paystackPublicKey;
  if (!publicKey) {
    handlers.onError?.(new Error("Paystack public key not configured"));
    return null;
  }

  if (typeof window !== "undefined" && window.PaystackPop) {
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(Number(amount) || 0), // kobo
      currency,
      ref: reference,
      metadata,
      callback: (response) => {
        // Callback does NOT verify payment
        // Backend verification required
        handlers.onSuccess?.(response);
      },
      onClose: () => handlers.onClose?.()
    });
    handler.openIframe();
    return handler;
  }

  // Fallback to redirect
  if (reference) {
    window.location.href = `https://checkout.paystack.com/${reference}`;
  }
}
```

### 4. Payment Callback Handling

```javascript
// Checkout.jsx
launchPaystack(
  {
    email: delivery.email,
    amount: init?.amount ?? total * 100,
    reference: init?.reference,
    currency: init?.currency || "NGN",
    metadata: init?.metadata
  },
  {
    onSuccess: (response) => {
      // Payment completed in popup
      // Backend should have been notified (webhook)
      // Show pending verification state
      setResult({ 
        status: "pending-verification", 
        reference: response?.reference 
      });
      setStep("confirmation");
    },
    onClose: () => {
      setPaying(false);
      setPayError("Payment was cancelled.");
      setStep("payment");
    },
    onError: (err) => {
      setPaying(false);
      setPayError(err?.message || "Payment could not be completed.");
      setStep("payment");
    }
  }
);
```

## Backend Requirements

### POST /payments/initialize

**Responsibilities:**
1. Validate checkout data
2. Create order record (pending)
3. Call Paystack Initialize Transaction API
4. Return reference to frontend

**Paystack API Call:**
```
POST https://api.paystack.co/transaction/initialize
Headers:
  Authorization: Bearer {SECRET_KEY}
  Content-Type: application/json

Body:
{
  "email": "customer@example.com",
  "amount": 20250000,  // amount in kobo
  "currency": "NGN",
  "metadata": {
    "orderId": "ord-xxx",
    "customerName": "John Doe"
  }
}
```

**Response to Frontend:**
```json
{
  "reference": "PSK-ABC123XYZ",
  "amount": 20250000,
  "currency": "NGN",
  "authorizationUrl": "https://checkout.paystack.com/PSK-ABC123XYZ",
  "accessCode": "abc123xyz",
  "metadata": { ... }
}
```

### POST /payments/verify (Webhook or Callback)

**Responsibilities:**
1. Receive payment reference
2. Call Paystack Verify Transaction API
3. Update order status based on verification
4. Send confirmation to customer

**Paystack API Call:**
```
GET https://api.paystack.co/transaction/verify/{reference}
Headers:
  Authorization: Bearer {SECRET_KEY}
```

## Environment Configuration

### Frontend (.env)
```bash
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
```

### Backend (.env)
```bash
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

## Payment States

| State | Description | UI Display |
|-------|-------------|------------|
| `preparing` | Collecting checkout info | Delivery form |
| `initializing` | Calling backend | Loading spinner |
| `processing` | Paystack popup open | Popup visible |
| `pending-verification` | Callback received | "Verifying payment" |
| `confirmed` | Backend verified | Order confirmation |
| `failed` | Payment failed | Error message |
| `cancelled` | User closed popup | Return to payment |

## Testing

### Test Cards (Paystack Sandbox)
| Card Number | Type | PIN | CVV |
|-------------|------|-----|-----|
| 4084 0840 8408 4080 | Visa | 1234 | Any 3 digits |
| 5555 5555 5555 4444 | Mastercard | 1234 | Any 3 digits |

### Test Scenarios
- [ ] Successful payment
- [ ] Failed payment (declined card)
- [ ] Cancelled payment (close popup)
- [ ] Network error during initialization
- [ ] Webhook verification failure

## Troubleshooting

### Common Issues

**"Paystack public key not configured"**
- Check `VITE_PAYSTACK_PUBLIC_KEY` in .env
- Restart dev server after env change

**"Payment could not be initialized"**
- Verify backend `/payments/initialize` endpoint
- Check backend Paystack secret key configuration

**"Payment verification failed"**
- Backend should verify via webhook or callback
- Check Paystack dashboard for transaction status

**Popup not opening**
- Ensure Paystack script loaded (`loadPaystackScript()`)
- Check browser popup blocker settings

## Webhook Setup

Configure webhook in Paystack Dashboard:
1. Settings → API Keys & Webhooks
2. Add webhook endpoint: `https://api.asatech.ng/webhooks/paystack`
3. Select events: `charge.success`, `charge.failed`
4. Save webhook secret for signature verification

### Webhook Handler (Backend)
```javascript
app.post('/webhooks/paystack', (req, res) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = req.body.event;
  const data = req.body.data;
  
  if (event === 'charge.success') {
    // Verify and update order
    await verifyAndConfirmOrder(data.reference);
  }
  
  res.status(200).send('OK');
});
```

## Compliance

- PCI DSS compliance handled by Paystack
- No card data touches ASATECH servers
- SSL/TLS required for all payment pages
- Webhook signature verification mandatory
