# ASATECH Frontend

Production-ready React frontend for the ASATECH premium gadgets e-commerce platform.

> **Note on repository structure:** For build-tooling reasons (Vite expects
> `index.html`, `package.json` and `vite.config.ts` at the project root), the
> frontend source lives at the repository root. This `frontend/` folder is
> reserved for frontend-specific documentation and configuration. When you
> deploy the frontend independently, treat the repository root as the
> frontend build root.

## Tech Stack

- **React 19** + **Vite 7** (JavaScript, not TypeScript)
- **Tailwind CSS v4** — design tokens & utility-first styling
- **Material UI** — complex controls (dialogs, tables, selects, menus)
- **Lucide React** — icons
- **React Router v6** — client-side routing (HashRouter)

## Project Layout

```
<repository root>            ← Vite build root (frontend lives here)
├── index.html               ← HTML entry
├── package.json             ← Frontend dependencies + scripts
├── vite.config.ts           ← Vite configuration
├── src/
│   ├── App.jsx              ← Route definitions
│   ├── main.jsx             ← Entry point + providers
│   ├── index.css            ← Global styles & design tokens
│   ├── components/          ← Reusable UI components
│   │   ├── ui/              ← Design-system primitives
│   │   ├── Logo.jsx         ← Brand mark
│   │   ├── ProductCard.jsx  ← Product tile
│   │   ├── Rating.jsx       ← Star rating
│   │   ├── Timeline.jsx     ← Order tracking steps
│   │   ├── charts.jsx       ← SVG charts (line, bar, donut)
│   │   ├── guards.jsx       ← Route guards
│   │   └── ...
│   ├── layouts/             ← Page layouts (Storefront, Auth, Customer, Admin)
│   ├── pages/               ← Route pages
│   │   ├── auth/            ← Login, Register, Forgot/Reset password
│   │   ├── account/         ← Customer dashboard
│   │   └── admin/           ← Admin console
│   ├── services/            ← API abstraction layer
│   │   ├── client.js        ← HTTP client (token attachment, error handling)
│   │   ├── config.js        ← Environment-driven configuration
│   │   ├── authService.js
│   │   ├── catalogService.js
│   │   ├── orderService.js
│   │   ├── paymentService.js  ← Paystack integration boundary
│   │   ├── fraudService.js
│   │   └── adminService.js
│   ├── state/               ← Context providers (Theme, Auth, Cart, Toast)
│   ├── hooks/               ← Custom hooks (useAsync)
│   ├── lib/                 ← Utilities & constants
│   └── utils/               ← cn() helper
├── public/
│   └── images/              ← Product & hero images
└── frontend/
    ├── README.md            ← This file
    └── .env.example         ← Frontend environment template
```

## Quick Start

From the repository root:

```bash
# Install dependencies
npm install

# Configure environment
cp frontend/.env.example .env

# Edit .env — set the API URL and Paystack public key
# VITE_API_BASE_URL=http://localhost:8080/api/v1
# VITE_PAYSTACK_PUBLIC_KEY=pk_test_...

# Start dev server (http://localhost:5173)
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build
npm run preview
```

## Environment Variables

All Vite variables must be prefixed with `VITE_` to be exposed to the client.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | ✅ | Backend API base URL, e.g. `http://localhost:8080/api/v1` |
| `VITE_PAYSTACK_PUBLIC_KEY` | ✅ for checkout | Paystack **public** key (`pk_test_…` / `pk_live_…`) |
| `VITE_APP_MODE` | – | `development` / `staging` / `production` |

⚠️ **Never place the Paystack SECRET key here.** It stays on the backend.

## Routing

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Home / storefront landing |
| `/products` | Public | Product catalogue |
| `/products/:slug` | Public | Product details |
| `/cart` | Public | Shopping cart |
| `/checkout` | 🔒 Customer | Multi-step checkout (login required) |
| `/login`, `/register` | Public | Authentication |
| `/forgot-password`, `/reset-password` | Public | Password recovery |
| `/account/*` | 🔒 Customer | Customer dashboard |
| `/admin/*` | 🔒 Admin | Admin console |

Route guards (`RequireAuth`, `RequireAdmin`) enforce access at the UX layer.
Real authorization is enforced by the backend on every API call.

## Authentication

1. User logs in → backend returns `{ token, user }`
2. `authService.setSession()` stores both in `localStorage`
3. `client.js` automatically attaches `Authorization: Bearer <token>` to every request
4. On `401` responses the local session is cleared and the user is bounced back to `/login`

## Payment Flow (Paystack)

```
Cart → Delivery → Payment (auth required) → Paystack popup → Confirmation
```

1. Frontend collects items + shipping and calls `POST /payments/initialize`
2. Backend calculates the authoritative total, creates a pending order,
   initialises Paystack and returns `{ reference, amount, publicKey, ... }`
3. Frontend calls `launchPaystack()` to open the Paystack inline popup
4. Paystack processes the payment and fires the callback
5. **Paystack webhook** hits the backend → backend verifies with Paystack
   server-side → order is marked paid, stock is decremented, email sent
6. Frontend shows "payment received, awaiting verification" then confirmation

Payment **verification never happens in the browser**.

## Design System

### Colors (CSS custom properties)

| Token | Dark | Light |
|-------|------|-------|
| `--canvas` | `#070a12` | `#f4f6fa` |
| `--panel` | `#0d1220` | `#ffffff` |
| `--raised` | `#141b2c` | `#edf0f6` |
| `--line` | `#1f2737` | `#e3e7ef` |
| `--ink` | `#e7ecf5` | `#0e1729` |
| `--muted` | `#99a4b8` | `#5a6474` |
| `--brand-500` | `#3b82f6` | `#3b82f6` |

### Typography
Inter (400 / 500 / 600 / 700 / 800), loaded from Google Fonts.

### Theme mode
Dark by default. Toggle persists to `localStorage` under `asatech-theme`.
A tiny inline script in `index.html` applies the class before hydration to
avoid a flash of the wrong theme.

## Development Notes

- **State management** uses React Context (Theme, Auth, Cart, Toast). Cart and
  wishlist are persisted to `localStorage`.
- **API responses** use a `{ success, data, count, total, page, pages }`
  envelope. The `client.js` module transparently unwraps `data`; for
  paginated arrays, meta (total, page, pages, count) is attached as `.meta`
  on the returned array.
- **Error handling** — every async view handles loading / empty / error /
  success states. An error boundary at the root catches rendering errors.
- **Accessibility** — semantic HTML, keyboard navigation, visible focus
  rings, ARIA labels on icon-only buttons, sufficient contrast in both
  themes.

## Testing (Manual Checklist)

- [ ] Product listing and filtering
- [ ] Product details and image gallery
- [ ] Add to cart, quantity updates, remove
- [ ] Registration → auto-login → account dashboard
- [ ] Login → checkout flow (protected)
- [ ] Paystack popup opens with correct amount
- [ ] Admin console loads (with admin credentials)
- [ ] Dark ↔ Light theme toggle
- [ ] Mobile navigation and responsive layouts
- [ ] 404 page on unknown routes

## Deployment

The `dist/` folder is a static bundle deployable to any static host:
- Vercel, Netlify, Cloudflare Pages (auto-detected)
- AWS S3 + CloudFront
- Any Nginx / Apache server (with SPA rewrite to `index.html`)

See `docs/DEPLOYMENT.md` for detailed instructions.

## License

PROPRIETARY — ASATECH
