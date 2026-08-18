import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { Card } from "@/components/ui/Surfaces";
import { StatusBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { useAuth } from "@/state/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { listOrders } from "@/services/orderService";
import { formatCurrency, formatDate } from "@/lib/format";

export default function Orders() {
  const { user } = useAuth();
  const { data: orders, loading } = useAsync(() => listOrders({ customerId: user?.id }), [user?.id]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Orders</h1>
        <p className="mt-1 text-sm text-muted">Track and manage your orders.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (orders || []).length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you place an order it will show up here."
          action={
            <Link to="/products" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
              Start shopping
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <Link to={`/account/orders/${o.ref}`} className="text-sm font-bold text-ink hover:text-brand-500">
                      {o.ref}
                    </Link>
                    <StatusBadge status={o.orderStatus} />
                    <StatusBadge status={o.paymentStatus} />
                  </div>
                  <p className="mt-1 text-xs text-muted">Placed {formatDate(o.date)}</p>
                </div>
                <p className="text-base font-bold text-ink">{formatCurrency(o.total)}</p>
              </div>
              <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
                {o.items.map((it) => (
                  <div key={it.productId} className="flex shrink-0 items-center gap-2 rounded-lg border border-line p-1.5 pr-3">
                    <img src={it.image} alt="" className="h-10 w-10 rounded-md object-cover" />
                    <div>
                      <p className="text-xs font-medium text-ink">{it.name}</p>
                      <p className="text-xs text-muted">× {it.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right">
                <Link to={`/account/orders/${o.ref}`} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                  View details →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
