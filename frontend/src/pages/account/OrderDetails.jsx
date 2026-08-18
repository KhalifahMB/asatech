import { useParams, Link } from "react-router-dom";
import { ChevronLeft, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Surfaces";
import { StatusBadge, RiskBadge } from "@/components/ui/Badges";
import { Timeline } from "@/components/Timeline";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { getOrder } from "@/services/orderService";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { TRACKING_STEPS } from "@/lib/constants";

function toTimeline(order) {
  return TRACKING_STEPS.map((step) => {
    const found = order.timeline.find((t) => t.step === step.key);
    return {
      label: step.label,
      at: found?.at || null,
      done: found?.done || false,
    };
  });
}

export default function OrderDetails() {
  const { ref } = useParams();
  const { data: order, loading } = useAsync(() => getOrder(ref), [ref]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        description="We couldn’t find this order."
        action={
          <Link to="/account/orders" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            Back to orders
          </Link>
        }
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Link to="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
          <ChevronLeft className="h-4 w-4" /> Orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{order.ref}</h1>
          <StatusBadge status={order.orderStatus} />
          <StatusBadge status={order.paymentStatus} />
          <RiskBadge level={order.riskLevel} score={order.riskScore} />
        </div>
        <p className="mt-1 text-sm text-muted">Placed {formatDateTime(order.date)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Order tracking</h2>
            <p className="mb-5 mt-1 text-xs text-muted">
              Status shown is illustrative until connected to live tracking.
            </p>
            <Timeline steps={toTimeline(order)} />
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Items</h2>
            <ul className="mt-4 divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.productId} className="flex items-center gap-4 py-3">
                  <img src={it.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{it.name}</p>
                    <p className="text-xs text-muted">
                      {formatCurrency(it.price)} × {it.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    {formatCurrency(it.price * it.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-ink">{formatCurrency(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="text-ink">{formatCurrency(order.shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-ink">
                <dt>Total</dt>
                <dd>{formatCurrency(order.total)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Payment</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Reference</dt>
                <dd className="font-mono text-xs text-ink">{order.paymentRef}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Status</dt>
                <dd><StatusBadge status={order.paymentStatus} /></dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <MapPin className="h-4 w-4 text-brand-500" /> Delivery address
            </h2>
            <div className="mt-3 text-sm text-muted">
              <p className="font-medium text-ink">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.line1}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}
              </p>
              <p>{order.shippingAddress.phone}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
