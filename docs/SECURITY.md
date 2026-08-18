# Security Documentation

This document outlines security considerations for the ASATECH platform.

## Security Principles

### 1. Defense in Depth
Multiple layers of security controls across frontend, backend, and infrastructure.

### 2. Least Privilege
Users and systems have only the minimum access required.

### 3. Secure by Default
Security features enabled by default, not opt-in.

### 4. Fail Securely
Errors don't expose sensitive information.

## Frontend Security

### Authentication

**Current Implementation:**
- Token stored in localStorage
- Token included in Authorization header
- Route guards prevent unauthorized access

**Limitations:**
- localStorage vulnerable to XSS
- Token not HttpOnly (accessible to JavaScript)
- No automatic token refresh

**Recommendations for Production:**
1. Use short-lived access tokens (15-30 minutes)
2. Implement refresh token rotation
3. Consider cookie-based auth with HttpOnly flag
4. Add token binding to device fingerprint

### Authorization

**Frontend Role Checks:**
```javascript
// CustomerLayout.jsx
if (!user) redirect to login

// AdminLayout.jsx  
if (!user || user.role !== 'admin') redirect to account
```

**Important:** Frontend authorization is UX-only. Backend MUST enforce all authorization.

### Input Validation

**Form Validation:**
- Email format validation
- Password strength requirements
- Required field enforcement
- Client-side validation for UX

**Backend Validation Required:**
- All inputs must be validated server-side
- Never trust client-side validation
- Sanitize HTML/rich text inputs
- Validate against SQL injection

### XSS Prevention

**Current Protections:**
- React escapes JSX by default
- No `dangerouslySetInnerHTML` used
- Content from API treated as untrusted

**Best Practices:**
```javascript
// ✅ Safe - React escapes
<div>{userInput}</div>

// ❌ Dangerous - bypasses escaping
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Safe - sanitize if HTML required
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### CSRF Protection

**Current State:**
- No CSRF tokens in frontend
- Relies on backend CSRF protection

**Recommendations:**
1. Backend should require CSRF tokens for state-changing requests
2. Use SameSite=Strict cookies
3. Verify Origin/Referer headers server-side

## Payment Security

### Paystack Integration

**DO:**
- ✅ Use public key only in frontend
- ✅ Initialize payments through backend
- ✅ Let backend verify payments
- ✅ Use HTTPS for all payment pages
- ✅ Implement webhook signature verification (backend)

**DON'T:**
- ❌ Never expose secret key
- ❌ Never verify payments client-side
- ❌ Never store card details
- ❌ Never log payment data
- ❌ Never use HTTP for checkout

### PCI DSS Compliance

ASATECH is **PCI DSS compliant by design** because:
- Card data entered directly in Paystack popup
- No card data touches ASATECH servers
- Paystack handles all PCI scope

**Responsibilities:**
- Ensure HTTPS on checkout pages
- Don't attempt to capture card data
- Keep Paystack SDK updated

## Data Protection

### Sensitive Data

**Never Store Client-Side:**
- Payment card numbers
- CVV codes
- Bank account details
- Full authentication tokens (store reference only)
- Password hashes

**Acceptable for localStorage:**
- Auth token reference (not the actual secret)
- Shopping cart contents
- Theme preference
- User ID (non-sensitive identifier)

### Data in Transit

**Requirements:**
- All API calls over HTTPS
- TLS 1.2 minimum (TLS 1.3 recommended)
- Certificate validation enabled
- No mixed content (HTTP resources on HTTPS page)

### Data at Rest

**Backend Responsibilities:**
- Encrypt sensitive data (PII, payment info)
- Use strong encryption (AES-256)
- Rotate encryption keys
- Secure key storage (HSM, KMS)

## Access Control

### Route Protection

**Implemented:**
```javascript
// Public routes
/ 
/products
/products/:slug
/cart

// Protected (customer)
/checkout
/account/*

// Protected (admin)
/admin/*
```

**Backend Enforcement:**
- Verify JWT on every protected endpoint
- Check user role for admin endpoints
- Validate resource ownership (user can only access their orders)

### API Security

**Required Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Response Headers (Backend):**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

## Fraud Prevention

### Risk Scoring

**Frontend Role:**
- Display risk scores provided by backend
- Show risk factors in investigation UI
- Allow admin to review/decide on alerts

**Backend Role:**
- Compute risk scores
- Generate fraud alerts
- Implement velocity checks
- Block suspicious transactions

### Risk Indicators

Monitored factors:
- High-value purchases
- Multiple purchases in short period
- New/unrecognized device
- Multiple failed login attempts
- Unusual purchasing behavior
- Geographic anomalies

### Admin Controls

**Available Actions:**
- Approve transaction
- Reject transaction
- Mark for review
- Suspend customer account
- Force password reset

## Audit & Logging

### Audit Events

Logged actions:
- Authentication (login, logout, failed attempts)
- Order creation and status changes
- Payment transactions
- Admin actions (product management, fraud decisions)
- Security events (password changes, session management)

### Log Requirements

**Each Log Entry:**
- Timestamp (UTC)
- Actor (user ID or "system")
- Action performed
- Resource affected
- Status (success/failure)
- IP address
- User agent

**Retention:**
- Security logs: 1 year minimum
- Transaction logs: 7 years (regulatory)
- Audit logs: 2 years minimum

## Incident Response

### Security Incident Types

1. **Data Breach**: Unauthorized data access
2. **Payment Fraud**: Fraudulent transactions
3. **Account Takeover**: Unauthorized account access
4. **DDoS Attack**: Service disruption
5. **Vulnerability Disclosure**: Security flaw reported

### Response Procedure

1. **Detect**: Monitor alerts, logs, reports
2. **Contain**: Isolate affected systems
3. **Investigate**: Determine scope and cause
4. **Eradicate**: Remove threat
5. **Recover**: Restore normal operations
6. **Notify**: Inform affected parties (if required)
7. **Review**: Post-incident analysis

### Contact

**Security Issues:**
- Email: security@asatech.ng
- Response time: 24 hours

## Compliance

### Regulatory Requirements

**NDPR (Nigeria Data Protection Regulation):**
- User consent for data processing
- Right to access/delete data
- Data breach notification (72 hours)
- Privacy policy disclosure

**PCI DSS:**
- Handled by Paystack (SAQ A)
- Annual compliance validation

### Privacy

**User Rights:**
- Access personal data
- Correct inaccurate data
- Delete account and data
- Export data portability

**Implementation:**
- Account deletion in security settings
- Data export upon request
- Privacy policy in footer

## Security Testing

### Recommended Tests

**Automated:**
- [ ] Dependency vulnerability scanning (`npm audit`)
- [ ] Static analysis (ESLint security plugins)
- [ ] SAST tools (SonarQube, Snyk)

**Manual:**
- [ ] Authentication bypass testing
- [ ] Authorization testing (vertical/horizontal privilege escalation)
- [ ] Input validation testing
- [ ] Session management testing
- [ ] XSS testing

**Third-Party:**
- [ ] Penetration testing (annual)
- [ ] Security audit (annual)

### Vulnerability Disclosure

**Responsible Disclosure Policy:**
1. Researcher reports vulnerability
2. Security team acknowledges (24 hours)
3. Investigation and fix
4. Coordinated disclosure
5. Credit to researcher (if desired)

## Security Checklist

### Pre-Launch
- [ ] HTTPS enforced
- [ ] Paystack keys configured (test → live)
- [ ] Environment variables secured
- [ ] CORS configured correctly
- [ ] Error messages don't leak info
- [ ] Admin accounts secured
- [ ] Backup procedures tested

### Ongoing
- [ ] Dependencies updated monthly
- [ ] Security patches applied promptly
- [ ] Logs reviewed weekly
- [ ] Access reviews quarterly
- [ ] Penetration testing annually
- [ ] Incident response plan tested

### After Incident
- [ ] Root cause identified
- [ ] Fix implemented and tested
- [ ] Documentation updated
- [ ] Team trained on lessons learned
- [ ] Monitoring enhanced
