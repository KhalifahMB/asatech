import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, ShoppingCart, Search, User, ChevronDown, X } from "lucide-react";
import { Drawer, Menu as MuiMenu, MenuItem } from "@mui/material";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCart } from "@/state/CartContext";
import { useAuth } from "@/state/AuthContext";
import { CATEGORIES } from "@/lib/constants";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Shop" },
  { to: "/products?sort=deals", label: "Deals" },
];

function navLinkClass({ isActive }) {
  return `text-sm font-medium transition-colors ${
    isActive ? "text-brand-500" : "text-muted hover:text-ink"
  }`;
}

function StoreNavbar({ onOpenCategories }) {
  const { count } = useCart();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-panel/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" aria-label="ASATECH home">
          <Logo />
        </Link>

        <nav className="ml-6 hidden items-center gap-6 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.label} to={n.to} className={navLinkClass}>
              {n.label}
            </NavLink>
          ))}
          <button
            onClick={onOpenCategories}
            className="flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Categories <ChevronDown className="h-4 w-4" />
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/cart"
            aria-label="Shopping cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-raised hover:text-ink"
          >
            <ShoppingCart className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[0.65rem] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <Link
            to={user ? (user.role === "admin" ? "/admin" : "/account") : "/login"}
            className="hidden items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition hover:bg-raised hover:text-ink sm:flex"
          >
            <User className="h-4 w-4" />
            {user ? "Account" : "Sign in"}
          </Link>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}

function MobileDrawer({ open, onClose }) {
  const { user } = useAuth();
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div className="flex h-full w-72 flex-col p-5">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <button onClick={onClose} aria-label="Close menu" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              onClick={onClose}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-raised"
            >
              {n.label}
            </Link>
          ))}
          <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-faint">
            Categories
          </p>
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              to={`/products?category=${c.id}`}
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-raised hover:text-ink"
            >
              {c.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <Link
            to={user ? (user.role === "admin" ? "/admin" : "/account") : "/login"}
            onClick={onClose}
            className="block rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-semibold text-white"
          >
            {user ? "My account" : "Sign in"}
          </Link>
        </div>
      </div>
    </Drawer>
  );
}

const FOOTER_COLS = [
  {
    title: "Shop",
    links: CATEGORIES.slice(0, 5).map((c) => ({ label: c.label, to: `/products?category=${c.id}` })),
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Create account", to: "/register" },
      { label: "My orders", to: "/account/orders" },
      { label: "Wishlist", to: "/account/wishlist" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/products" },
      { label: "Contact", to: "/products" },
      { label: "Shipping & returns", to: "/products" },
    ],
  },
];

export default function StorefrontLayout() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);

  return (
    <div className="flex min-h-screen flex-col">
      <StoreNavbar onOpenCategories={(e) => setAnchor(e.currentTarget)} />
      <MuiMenu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {CATEGORIES.map((c) => (
          <MenuItem
            key={c.id}
            onClick={() => {
              setAnchor(null);
              navigate(`/products?category=${c.id}`);
            }}
          >
            {c.label}
          </MenuItem>
        ))}
      </MuiMenu>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo tagline />
            <p className="mt-4 max-w-xs text-sm text-muted">
              Premium gadgets with a secure, reliable checkout experience — electronics you can
              trust, delivered anywhere.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-ink">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-muted transition hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-faint sm:flex-row sm:px-6">
            <p>© {new Date().getFullYear()} ASATECH. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <span className="inline-flex h-5 items-center rounded bg-brand-500/10 px-2 text-[0.65rem] font-semibold text-brand-500">
                SSL
              </span>
              Secure online payments
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
