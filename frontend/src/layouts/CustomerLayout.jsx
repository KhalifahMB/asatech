import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Package,
  CreditCard,
  Heart,
  Wallet,
  Bell,
  ShieldCheck,
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

const NAV = [
  { to: "/account", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/account/profile", label: "Profile", icon: User },
  { to: "/account/orders", label: "Orders", icon: Package },
  { to: "/account/transactions", label: "Transactions", icon: CreditCard },
  { to: "/account/wishlist", label: "Wishlist", icon: Heart },
  { to: "/account/payment-methods", label: "Payment methods", icon: Wallet },
  { to: "/account/notifications", label: "Notifications", icon: Bell },
  { to: "/account/security", label: "Security", icon: ShieldCheck },
];

function SidebarContent({ onNavigate }) {
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
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const avatar = (
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
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-panel p-5 lg:flex">
        <Link to="/" className="mb-8 px-2">
          <Logo />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
        <Link
          to="/"
          className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-raised hover:text-ink"
        >
          <Store className="h-4 w-4" />
          Back to store
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
            {avatar}
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>

      <MuiMenu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); navigate("/account/profile"); }}>
          Profile
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
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </div>
      </Drawer>
    </div>
  );
}
