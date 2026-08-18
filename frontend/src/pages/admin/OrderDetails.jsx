import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, RiskBadge } from "@/components/ui/Badges";
import { SelectField } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { ScoreBar } from "@/components/charts";
import { useToast } from "@/state/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { getOrder } from "@/services/orderService";
import { ORDER_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function AdminOrderDetails() {
  const { ref } = useParams();
  const toast = useToast();
  const { data: order, loading } = useAsync(() => getOrder(ref), [ref]);
  const [status, setStatus] = useState("");

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
        action={<Link to="/admin/orders" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Back to orders</Link>}
      />
    );
  }

  // Customer data comes populated on the order from the API
  const customer = typeof order.customerId === "object" ? order.customerId : null;

  const updateStatus = () => {
    if (!status) return;
    toast.success("Order status updated", `${order.ref} → ${status} (connects to backend on integration).`);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={order.ref}
        subtitle={`Placed ${formatDateTime(order.date)}`}
        breadcrumbs={[{ label: "Orders", to: "/admin/orders" }, { label: order.ref }]}
        actions={
          order.riskLevel === "high" && (
            <Button to={`/admin/fraud-alerts`} variant="dangerGhost" icon={ShieldAlert}>
              Investigate
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        <StatusBadge status={order.orderStatus} />
        <StatusBadge status={order.paymentStatus} />
        <RiskBadge level={order.riskLevel} score={order.riskScore} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Items</h2>
            <ul className="mt-4 divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.productId} className="flex items-center gap-4 py-3">
                  <img src={it.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{it.name}</p>
                    <p className="text-xs text-muted">{formatCurrency(it.price)} × {it.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-ink">{formatCurrency(it.price * it.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="text-ink">{formatCurrency(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="text-ink">{formatCurrency(order.shipping)}</dd></div>
              <div className="flex justify-between text-base font-bold text-ink"><dt>Total</dt><dd>{formatCurrency(order.total)}</dd></div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Update order status</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-56">
                <SelectField
                  label="New status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={ORDER_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
                />
              </div>
              <Button onClick={updateStatus} disabled={!status}>
                Update
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Risk assessment</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-3xl font-bold text-ink">{order.riskScore}</span>
              <RiskBadge level={order.riskLevel} />
            </div>
            <ScoreBar score={order.riskScore} className="mt-3" />
            <p className="mt-3 text-xs text-muted">Risk score provided by the backend fraud engine.</p>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Customer</h2>
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-semibold text-ink">{order.customerName}</p>
              {customer && (
                <>
                  <p className="text-muted">{customer.email}</p>
                  <p className="text-muted">{customer.phone}</p>
                  <div className="mt-2">
                    <StatusBadge status={customer.status} />
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Payment</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Reference</dt><dd className="font-mono text-xs text-ink">{order.paymentRef}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Status</dt><dd><StatusBadge status={order.paymentStatus} /></dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
