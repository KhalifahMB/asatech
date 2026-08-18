import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, CreditCard, Truck, Heart, ShieldCheck, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Surfaces";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { useAuth } from "@/state/AuthContext";
import { useWishlist } from "@/state/wishlistStore";
import { listOrders, listTransactions } from "@/services/orderService";
import { formatCurrency, formatDate } from "@/lib/format";

export default function Overview() {
  const { user } = useAuth();
  const { ids } = useWishlist();
  const [orders, setOrders] = useState(null);
  const [txs, setTxs] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      listOrders({ limit: 10 }).catch(() => []),
      listTransactions({ limit: 10 }).catch(() => []),
    ]).then(([o, t]) => {
      if (!active) return;
      setOrders(o || []);
      setTxs(t || []);
    });
    return () => {
      active = false;
    };
  }, []);

  const loading = orders === null;
  const totalSpent = (txs || [])
    .filter((t) => t.status === "successful")
    .reduce((s, t) => s + t.amount, 0);
  const inTransit = (orders || []).filter((o) =>
    ["processing", "confirmed", "shipped"].includes(o.orderStatus)
  ).length;

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">Here's what's happening with your account.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Orders" value={orders?.length ?? "—"} icon={Package} tone="brand" loading={loading} />
        <StatCard label="Total spent" value={formatCurrency(totalSpent)} icon={CreditCard} tone="success" loading={loading} />
        <StatCard label="In transit" value={inTransit} icon={Truck} tone="info" loading={loading} />
        <StatCard label="Saved items" value={ids.length} icon={Heart} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Recent orders</h2>
            <Link
              to="/account/orders"
              className="flex items-center gap-0.5 text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {loading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)
            ) : (orders || []).length === 0 ? (
              <EmptyState title="No orders yet" description="Your orders will appear here." />
            ) : (
              (orders || []).slice(0, 3).map((o) => (
                <Link
                  key={o._id}
                  to={`/account/orders/${o.ref}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 transition hover:bg-raised"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{o.ref}</p>
                    <p className="text-xs text-muted">
                      {formatDate(o.createdAt)} · {o.items.length} item(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-sm font-semibold text-ink sm:block">
                      {formatCurrency(o.total)}
                    </span>
                    <StatusBadge status={o.orderStatus} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Recent transactions</h2>
            <Link
              to="/account/transactions"
              className="flex items-center gap-0.5 text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {(txs || []).length === 0 ? (
              <EmptyState title="No transactions yet" description="Your payment history will appear here." />
            ) : (
              (txs || []).slice(0, 3).map((t) => (
                <div
                  key={t._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{t.reference}</p>
                    <p className="text-xs text-muted">{formatDate(t.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-ink">{formatCurrency(t.amount)}</span>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="flex items-start gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-ink">Account security</h3>
          <p className="mt-1 text-sm text-muted">
            Keep your account safe with a strong password and up-to-date contact details.
          </p>
          <Link
            to="/account/security"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Manage security <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
