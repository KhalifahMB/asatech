import { Link, Outlet } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* Ambient brand bloom */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-center overflow-visible">
        <div className="h-[360px] w-[760px] max-w-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.16),transparent)]" />
      </div>

      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <main
        id="main"
        tabIndex={-1}
        className="relative z-0 flex flex-1 items-center justify-center px-5 py-10 sm:px-8"
      >
        <div className="w-full max-w-md">
          <div className="mb-7 flex justify-center">
            <Link
              to="/"
              aria-label="ASATECH — back to storefront"
              className="rounded-lg transition hover:opacity-85"
            >
              <Logo />
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)] sm:p-8">
            <Outlet />
          </div>

          <p className="mt-6 text-center text-xs text-faint">
            © {new Date().getFullYear()} ASATECH · Premium gadgets, securely paid.
          </p>
        </div>
      </main>
    </div>
  );
}