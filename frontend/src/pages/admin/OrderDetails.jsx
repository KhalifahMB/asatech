import { useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ShieldAlert, Mail, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, RiskBadge } from "@/components/ui/Badges";
import { SelectField } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { ScoreBar } from "@/components/charts";
import { useToast } from "@/state/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { getOrder, updateOrderStatus, sendOrderEmail, deleteOrder } from "@/services/orderService";
import { ORDER_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { productImageUrl } from "@/lib/image";

export default function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [tick, setTick] = useState(0);
  const { data: order, loading } = useAsync(() => getOrder(id), [id, tick]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailBusy, setEmailBusy] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const isUnpaid = !order || order.paymentStatus !== "paid";
  const ageMs = order ? Date.now() - new Date(order.createdAt).getTime() : 0;
  const canDelete = isUnpaid && ageMs <= TWO_HOURS_MS;

  const handleDelete = useCallback(async () => {
    if (!order) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteOrder(order._id);
      toast.success("Order deleted", `${order.ref} was deleted.`);
      navigate("/admin/orders");
    } catch (err) {
      toast.error("Delete failed", err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [order, confirmDelete, navigate, toast]);

  const handleUpdateStatus = useCallback(async () => {
    if (!status) return;
    setSaving(true);
    try {
      await updateOrderStatus(order._id, status);
      toast.success("Status updated", `${order.ref} is now "${status}".`);
      setTick((t) => t + 1);
      setStatus("");
    } catch (err) {
      toast.error("Update failed", err.message);
    } finally {
      setSaving(false);
    }
  }, [order, status, toast]);

  const handleSendEmail = useCallback(
    async (type) => {
      setEmailBusy(type);
      try {
        await sendOrderEmail(order._id, type);
        toast.success("Email sent", `Order ${type} email sent to ${order.customerName}.`);
      } catch (err) {
        toast.error("Email failed", err.message || "Could not send email.");
      } finally {
        setEmailBusy("");
      }
    },
    [order, toast]
  );

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
        action={
          <Link
            to="/admin/orders"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to orders
          </Link>
        }
      />
    );
  }

  const customer =
    typeof order.customerId === "object" ? order.customerId : null;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={order.ref}
        subtitle={`Placed ${formatDateTime(order.createdAt || order.date)}`}
        breadcrumbs={[{ label: "Orders", to: "/admin/orders" }, { label: order.ref }]}
        actions={
          <>
            {order.riskLevel === "high" && (
              <Button
                to={`/admin/fraud-alerts`}
                variant="dangerGhost"
                icon={ShieldAlert}
              >
                Investigate
              </Button>
            )}
            <Button
              variant={confirmDelete ? "danger" : "dangerGhost"}
              icon={Trash2}
              onClick={handleDelete}
              loading={deleting}
              disabled={!canDelete || deleting}
              title={
                order.paymentStatus === "paid"
                  ? "Paid orders cannot be deleted."
                  : ageMs > TWO_HOURS_MS
                    ? "Orders can only be deleted within 2 hours of placement."
                    : "Delete order"
              }
            >
              {confirmDelete ? "Confirm delete" : "Delete order"}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <StatusBadge status={order.orderStatus} prefix="Order" />
        <StatusBadge status={order.paymentStatus} prefix="Payment" />
        <RiskBadge level={order.riskLevel} score={order.riskScore} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Items</h2>
            <ul className="mt-4 divide-y divide-line">
              {order.items.map((it, idx) => (
                <li key={it.productId?._id || String(it.productId) || idx} className="flex items-center gap-4 py-3">
                  <img
                    src={productImageUrl(it.image)}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{it.name}</p>
                    <p className="text-xs text-muted">
                      {formatCurrency(it.price)} &times; {it.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    {formatCurrency(it.price * it.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-ink">{formatCurrency(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="text-ink">{formatCurrency(order.shipping)}</dd>
              </div>
              <div className="flex justify-between text-base font-bold text-ink">
                <dt>Total</dt>
                <dd>{formatCurrency(order.total)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">
              Update order status
            </h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-56">
                <SelectField
                  label="New status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={ORDER_STATUSES.map((s) => ({
                    value: s,
                    label: s[0].toUpperCase() + s.slice(1),
                  }))}
                />
              </div>
              <Button
                onClick={handleUpdateStatus}
                loading={saving}
                disabled={!status}
              >
                Update
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">
              Order emails
            </h2>
            <p className="mt-1 text-sm text-muted">
              Trigger or resend customer-facing emails for this order.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={Mail}
                loading={emailBusy === "confirmation"}
                onClick={() => handleSendEmail("confirmation")}
              >
                Send confirmation
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Send}
                loading={emailBusy === "delivery"}
                onClick={() => handleSendEmail("delivery")}
                disabled={!["shipped", "delivered"].includes(order.orderStatus)}
              >
                Send {order.orderStatus === "delivered" ? "delivery" : "shipping"}{" "}
                email
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Risk assessment</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-3xl font-bold text-ink">
                {order.riskScore}
              </span>
              <RiskBadge level={order.riskLevel} />
            </div>
            <ScoreBar score={order.riskScore} className="mt-3" />
            <p className="mt-3 text-xs text-muted">
              Risk score provided by the backend fraud engine.
            </p>
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
              <div className="flex justify-between">
                <dt className="text-muted">Reference</dt>
                <dd className="font-mono text-xs text-ink">
                  {order.paymentRef}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Status</dt>
                <dd>
                  <StatusBadge status={order.paymentStatus} prefix="Payment" />
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
