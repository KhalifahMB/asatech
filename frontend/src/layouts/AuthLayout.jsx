import { Link, Outlet } from "react-router-dom";
import { ShieldCheck, CreditCard, Zap } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  { icon: ShieldCheck, label: "Secure, verified checkout" },
  { icon: CreditCard, label: "Multiple payment options" },
  { icon: Zap, label: "Fast order processing" },
];

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-canvas p-10 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.12),transparent_45%)]" />
        <Link to="/" className="relative">
          <Logo tagline />
        </Link>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink">
            Premium gadgets,
            <br />
            <span className="text-brand-500">securely paid.</span>
          </h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-sm text-muted">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                  <f.icon className="h-4 w-4" />
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-faint">© {new Date().getFullYear()} ASATECH</p>
      </div>

      <div className="relative flex w-full flex-col lg:w-[520px]">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Link to="/">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="absolute right-5 top-5 hidden lg:block">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
