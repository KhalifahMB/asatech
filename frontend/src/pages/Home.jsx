import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Truck,
  BadgeCheck,
  RotateCcw,
  ArrowRight,
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Headphones,
  Plug,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/ProductCard";
import { ErrorState, Skeleton } from "@/components/ui/Feedback";
import { CATEGORIES } from "@/lib/constants";
import { getFeatured, listProducts } from "@/services/catalogService";

const CATEGORY_ICONS = {
  smartphones: Smartphone,
  laptops: Laptop,
  tablets: Tablet,
  smartwatches: Watch,
  headphones: Headphones,
  chargers: Plug,
  other: Box,
};

const TRUST = [
  { icon: ShieldCheck, title: "Secure checkout", desc: "Encrypted payments with verified transactions." },
  { icon: Truck, title: "Fast delivery", desc: "Tracked shipping on every order." },
  { icon: BadgeCheck, title: "Genuine products", desc: "Authentic devices, fully covered." },
  { icon: RotateCcw, title: "Easy returns", desc: "Hassle-free returns window." },
];

function ProductGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-[3/4]" />
      ))}
    </div>
  );
}

export default function Home() {
  const [featured, setFeatured] = useState(null);
  const [deals, setDeals] = useState(null);
  const [popular, setPopular] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getFeatured(8).catch(() => []),
      listProducts({ sort: "deals", limit: 4 }).catch(() => []),
      listProducts({ sort: "rating", limit: 4 }).catch(() => []),
    ])
      .then(([f, d, p]) => {
        if (!active) return;
        setFeatured(f || []);
        setDeals((d || []).filter((x) => x.previousPrice));
        setPopular(p || []);
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load products");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.14),transparent_50%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure payments, verified transactions
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Premium gadgets,
              <br />
              <span className="text-brand-500">delivered with trust.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted sm:text-lg">
              Shop the latest smartphones, laptops, audio and more — with a fast, secure checkout
              engineered for peace of mind.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/products" size="lg" iconRight={ArrowRight}>
                Shop now
              </Button>
              <Button to="/products?sort=deals" size="lg" variant="secondary">
                Browse deals
              </Button>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <img
              src="/images/hero.jpg"
              alt="ASATECH premium gadget collection"
              className="aspect-[4/3] w-full rounded-3xl border border-line object-cover"
            />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-line bg-panel">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                <t.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                <p className="text-xs text-muted">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Shop by category</h2>
            <p className="mt-1 text-sm text-muted">Find the perfect device for every need.</p>
          </div>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.id] || Box;
            return (
              <Link
                key={c.id}
                to={`/products?category=${c.id}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-line bg-panel p-5 text-center transition hover:border-brand-500/40 hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition group-hover:bg-brand-500 group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-semibold text-ink sm:text-sm">{c.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {error && (
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <ErrorState description={error} />
        </section>
      )}

      {/* Featured */}
      <section className="border-y border-line bg-panel/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink">Featured gadgets</h2>
              <p className="mt-1 text-sm text-muted">Hand-picked devices our customers love.</p>
            </div>
            <Link to="/products" className="flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-600">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-7">
            {featured === null ? (
              <ProductGridSkeleton />
            ) : featured.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {featured.map((p) => (
                  <ProductCard key={p._id || p.id} product={p} />
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted">No featured products yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Deals */}
      {deals !== null && deals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink">Limited-time deals</h2>
              <p className="mt-1 text-sm text-muted">Great devices at reduced prices.</p>
            </div>
            <Link to="/products?sort=deals" className="flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-600">
              All deals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {deals.map((p) => (
              <ProductCard key={p._id || p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Promo banner */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand-600 to-brand-800 p-8 sm:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="relative max-w-lg">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Upgrade your setup today.
            </h2>
            <p className="mt-3 text-sm text-brand-100">
              Explore the full ASATECH catalogue and enjoy a secure, seamless checkout from start
              to finish.
            </p>
            <Button to="/products" size="lg" variant="secondary" className="mt-6 bg-white text-brand-700 hover:bg-brand-50">
              Explore the catalogue
            </Button>
          </div>
        </div>
      </section>

      {/* Popular */}
      {popular !== null && popular.length > 0 && (
        <section className="border-t border-line bg-panel/50">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Most popular</h2>
            <p className="mt-1 text-sm text-muted">Top-rated devices across our range.</p>
            <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {popular.map((p) => (
                <ProductCard key={p._id || p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
