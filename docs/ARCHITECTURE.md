# ASATECH Frontend Architecture

## Overview

This document describes the frontend architecture of the ASATECH e-commerce platform. The application is built as a **single-page application (SPA)** using React with a focus on maintainability, scalability, and clean separation of concerns.

## Design Principles

1. **Component-Based**: Reusable, composable UI components
2. **Service Layer**: All API calls isolated in dedicated service modules
3. **State Colocation**: State kept as close to where it's used as possible
4. **Progressive Enhancement**: Works offline (demo mode), enhances with backend
5. **Security First**: No secrets in frontend, backend enforces all authorization

## Technology Stack

| Category | Technology | Rationale |
|----------|------------|-----------|
| Framework | React 19 | Component model, ecosystem, performance |
| Build | Vite 7 | Fast HMR, optimized builds |
| Styling | Tailwind CSS v4 | Utility-first, design tokens, dark mode |
| UI Library | Material UI | Complex components (dialogs, tables, selects) |
| Icons | Lucide React | Consistent, accessible icon set |
| Routing | React Router v6 | Declarative routing, route guards |
| State | Context API | Simple, no external dependencies |

## Directory Structure

```
src/
├── App.jsx                 # Root component, route definitions
├── main.jsx               # Entry point, provider tree
├── index.css              # Global styles, design tokens
│
├── components/            # Reusable components
│   ├── ui/               # Design system primitives
│   │   ├── Button.jsx    # Button variants (primary, secondary, ghost, danger)
│   │   ├── Field.jsx     # Form inputs (text, password, select, textarea)
│   │   ├── Surfaces.jsx  # Card, SectionHeader, Divider
│   │   ├── Badges.jsx    # StatusBadge, RiskBadge, StockBadge, Pill
│   │   ├── Feedback.jsx  # Spinner, PageLoader, Skeleton, EmptyState, ErrorState
│   │   └── Modal.jsx     # Dialog, ConfirmDialog
│   │
│   ├── Logo.jsx          # ASATECH brand mark
│   ├── ProductCard.jsx   # Product display with wishlist, add-to-cart
│   ├── Rating.jsx        # Star rating component
│   ├── QuantityControl.jsx # Quantity +/- control
│   ├── Timeline.jsx      # Order tracking steps
│   ├── charts.jsx        # SVG charts (LineChart, BarChart, DonutChart, ScoreBar)
│   ├── StatCard.jsx      # KPI display card
│   ├── ThemeToggle.jsx   # Dark/light mode switch
│   ├── guards.jsx        # Route protection components
│   ├── ErrorBoundary.jsx # Error boundary for graceful failures
│   └── ScrollToTop.jsx   # Scroll to top on route change
│
├── layouts/              # Page layout shells
│   ├── StorefrontLayout.jsx  # Public storefront (navbar, footer)
│   ├── AuthLayout.jsx        # Authentication pages (split layout)
│   ├── CustomerLayout.jsx    # Customer dashboard (sidebar navigation)
│   └── AdminLayout.jsx       # Admin console (sidebar with fraud badge)
│
├── pages/               # Route pages (one per file)
│   ├── Home.jsx         # Landing page
│   ├── Catalog.jsx      # Product listing with filters
│   ├── ProductDetails.jsx # Single product page
│   ├── Cart.jsx         # Shopping cart
│   ├── Checkout.jsx     # Multi-step checkout
│   ├── NotFound.jsx     # 404 page
│   │
│   ├── auth/            # Authentication
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── ForgotPassword.jsx
│   │   └── ResetPassword.jsx
│   │
│   ├── account/         # Customer dashboard
│   │   ├── Overview.jsx
│   │   ├── Profile.jsx
│   │   ├── Orders.jsx
│   │   ├── OrderDetails.jsx
│   │   ├── Transactions.jsx
│   │   ├── Wishlist.jsx
│   │   ├── PaymentMethods.jsx
│   │   ├── Notifications.jsx
│   │   └── Security.jsx
│   │
│   └── admin/           # Admin console
│       ├── Overview.jsx
│       ├── Products.jsx
│       ├── ProductForm.jsx
│       ├── Inventory.jsx
│       ├── Orders.jsx
│       ├── OrderDetails.jsx
│       ├── Customers.jsx
│       ├── Transactions.jsx
│       ├── FraudAlerts.jsx
│       ├── FraudInvestigation.jsx
│       ├── AuditLogs.jsx
│       └── Settings.jsx
│
├── services/            # API service layer
│   ├── config.js        # Environment configuration
│   ├── client.js        # HTTP client (fetch wrapper)
│   ├── authService.js   # Authentication endpoints
│   ├── paymentService.js # Paystack integration
│   ├── catalogService.js # Product catalogue
│   ├── orderService.js  # Orders and transactions
│   ├── fraudService.js  # Fraud alerts
│   └── adminService.js  # Admin operations
│
├── state/               # React Context providers
│   ├── ThemeContext.jsx # Dark/light mode, MUI theme
│   ├── AuthContext.jsx  # User authentication state
│   ├── CartContext.jsx  # Shopping cart state (localStorage)
│   └── ToastContext.jsx # Notification toasts
│
├── hooks/               # Custom React hooks
│   └── useAsync.js      # Async data fetching with loading states
│
├── lib/                 # Utilities and constants
│   ├── theme.js         # MUI theme builder
│   ├── format.js        # Currency, date, number formatting
│   └── constants.js     # Domain constants (categories, risk levels, statuses)
│
├── data/                # Development data
│   └── products.js      # Product catalogue (for development)
│
└── utils/               # Helper functions
    └── cn.js            # Class name merger (clsx + tailwind-merge)
```

## State Management

### Philosophy
- **Local State**: Component-level state with `useState`
- **Shared State**: Context for auth, cart, theme, notifications
- **Server State**: Service layer + `useAsync` hook for data fetching
- **Persistence**: localStorage for cart, theme, auth token reference

### Context Hierarchy
```
ThemeProvider (root)
├── ToastProvider
│   └── AuthProvider
│       └── CartProvider
│           └── App (Router)
```

## Routing

### Route Protection
- **Public**: Home, Catalog, Product Details, Cart
- **Protected (Customer)**: Checkout, Account pages
- **Protected (Admin)**: All `/admin/*` routes

### Route Guards
```jsx
// Customer route
<Route path="/checkout" element={
  <RequireAuth><Checkout /></RequireAuth>
} />

// Admin route
<Route path="/admin" element={
  <RequireAdmin><AdminOverview /></RequireAdmin>
} />
```

## API Architecture

### Service Layer Pattern
All API calls flow through dedicated service modules:

```
Component → Service → HTTP Client → Backend API
```

### Example Service
```javascript
// services/catalogService.js
import { client } from "./client";

export async function listProducts(params = {}) {
  return client.get("/products", params);
}

export async function getProduct(slug) {
  return client.get(`/products/${slug}`);
}
```

### HTTP Client
The `client.js` module provides:
- Base URL configuration
- JSON serialization
- Error handling with structured `ApiError`
- Network error detection

## Design System

### Design Tokens
Defined in `index.css` as CSS custom properties:
- `--canvas`: Page background
- `--panel`: Card/surface background
- `--raised`: Elevated surface
- `--line`: Border/divider color
- `--ink`: Primary text
- `--muted`: Secondary text
- `--faint`: Tertiary text

### Color System
- **Brand**: `#3b82f6` (blue-500)
- **Success**: `#10b981` (emerald-500)
- **Warning**: `#f59e0b` (amber-500)
- **Danger**: `#ef4444` (red-500)
- **Info**: `#3b82f6` (blue-500)

### Typography
- **Font**: Inter (Google Fonts)
- **Scale**: 12px, 14px, 16px, 18px, 20px, 24px, 32px
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

## Performance

### Optimizations
- Code splitting via React Router lazy loading (if needed)
- Image lazy loading on product cards
- Debounced search inputs
- Minimal re-renders via `useMemo` where beneficial
- Single-file build for simplified deployment

### Bundle Analysis
- Production bundle: ~750KB (gzipped: ~217KB)
- Includes: React, MUI, Tailwind, Lucide, Router

## Security

### Frontend Boundaries
- No secret keys in frontend code
- Payment verification server-side only
- Route guards are UX-only (backend enforces authorization)
- CORS handled by backend configuration
- CSRF tokens managed by backend

### Sensitive Data
- Auth token stored in localStorage (reference only)
- Cart persisted to localStorage (non-sensitive)
- Theme preference in localStorage
- No payment details stored client-side

## Error Handling

### Error Boundary
Catches React rendering errors and displays a graceful fallback.

### API Errors
Structured `ApiError` class with:
- `message`: User-friendly message
- `status`: HTTP status code
- `code`: Application error code
- `details`: Raw response data

### UI States
All async interfaces handle:
- Loading (skeleton loaders)
- Success (content)
- Empty (empty state illustration)
- Error (error state with retry)

## Testing Strategy

### Manual Testing Checklist
- [ ] Product browsing and filtering
- [ ] Add to cart and cart management
- [ ] Checkout flow (authenticated)
- [ ] Order placement
- [ ] Admin product management
- [ ] Fraud alert investigation
- [ ] Dark/light mode toggle
- [ ] Mobile responsive layouts

### Future: Automated Testing
- Unit tests for utilities and services
- Component tests for design system
- Integration tests for critical flows
- E2E tests for checkout

## Deployment

### Build Process
```bash
npm run build
```
Output: `dist/index.html` (single file with inlined assets)

### Hosting
- Static hosting (Netlify, Vercel, Cloudflare Pages)
- CDN for global distribution
- Environment variables configured in hosting platform

### Environment Configuration
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_PAYSTACK_PUBLIC_KEY`: Paystack public key

See `docs/DEPLOYMENT.md` for detailed deployment instructions.
