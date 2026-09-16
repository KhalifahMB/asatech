import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingBag,
  Users,
  CreditCard,
  ShieldAlert,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Store,
} from "lucide-react";
import { Drawer, Menu as MuiMenu, MenuItem } from "@mui/material";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/state/AuthContext";
import { initials } from "@/lib/format";
import { listFraudAlerts } from "@/services/fraudService";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { to: "/admin/fraud-alerts", label: "Fraud Alerts", icon: ShieldAlert },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ onNavigate, openAlerts }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive ? "bg-brand-500/10 text-brand-500" : "text-muted hover:bg-raised hover:text-ink"
            }`
          }
        >
          <item.icon className="h-4 w-4" />
          <span className="flex-1">{item.label}</span>
          {item.label === "Fraud Alerts" && openAlerts > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[0.65rem] font-bold text-white">
              {openAlerts}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [openAlerts, setOpenAlerts] = useState(0);

  useEffect(() => {
    let active = true;
    listFraudAlerts({ status: "new", limit: 100 })
      .then((alerts) => {
        if (active) setOpenAlerts((alerts || []).length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-panel p-5 lg:flex">
        <div className="mb-2 px-2">
          <Logo />
          <span className="mt-1 block px-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-faint">
            Admin Console
          </span>
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <SidebarContent openAlerts={openAlerts} />
        </div>
        <Link
          to="/"
          className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-raised hover:text-ink"
        >
          <Store className="h-4 w-4" />
          View storefront
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-panel/90 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link to="/" className="lg:hidden">
            <Logo showText={false} />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={(e) => setAnchor(e.currentTarget)}
              className="flex items-center gap-2 rounded-lg border border-line py-1 pl-1 pr-2 text-sm hover:bg-raised"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
                {initials(user?.name || "?")}
              </span>
              <span className="hidden max-w-[120px] truncate font-medium text-ink sm:block">
                {user?.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </button>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>

      <MuiMenu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); navigate("/admin/settings"); }}>
          Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </MenuItem>
      </MuiMenu>

      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <div className="flex h-full w-72 flex-col p-5">
          <div className="mb-8 flex items-center justify-between">
            <Logo />
            <button onClick={() => setMobileOpen(false)} aria-label="Close" className="text-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
          <SidebarContent onNavigate={() => setMobileOpen(false)} openAlerts={openAlerts} />
        </div>
      </Drawer>
    </div>
  );
}
