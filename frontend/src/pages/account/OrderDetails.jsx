import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, MapPin, CreditCard, ExternalLink, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { StatusBadge, RiskBadge } from "@/components/ui/Badges";
import { TextField } from "@/components/ui/Field";
import { Timeline } from "@/components/Timeline";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { useToast } from "@/state/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { getOrder, updateOrderAddress } from "@/services/orderService";
import { resumePayment, loadPaystackScript, launchPaystack } from "@/services/paymentService";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { productImageUrl } from "@/lib/image";
import { TRACKING_STEPS } from "@/lib/constants";

function toTimeline(order) {
  return TRACKING_STEPS.map((step) => {
    const found = (order.timeline || []).find((t) => t.step === step.key);
    return {
      label: step.label,
      at: found?.at || null,
      done: found?.done || false,
    };
  });
}

export default function OrderDetails() {
  const { id } = useParams();
  const toast = useToast();
  const [tick, setTick] = useState(0);
  const { data: order, loading } = useAsync(() => getOrder(id), [id, tick]);
  const [paying, setPaying] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ name: "", phone: "", line1: "", line2: "", city: "", state: "" });
  const [addressError, setAddressError] = useState("");

  const canResume = order && ["pending", "failed"].includes(order.paymentStatus);
  const addressEditable = order?.paymentStatus !== "paid";

  const handleResume = useCallback(async () => {
    if (!order) return;
    setPaying(true);
    try {
      const init = await resumePayment(order._id);
      if (init?.paid) {
        toast.success("Already paid", "This order has already been paid for.");
        setTick((t) => t + 1);
        return;
      }
      await loadPaystackScript();
      launchPaystack(
        {
          key: init?.publicKey,
          email: init?.email,
          amount: init?.amount,
          reference: init?.reference,
          currency: init?.currency || "NGN",
        },
        {
          onSuccess: () => {
            toast.success("Payment received", "Your payment is being verified. This may take a moment.");
            setTick((t) => t + 1);
          },
          onClose: () => {
            setPaying(false);
            toast.info("Payment cancelled", "You can retry whenever you're ready.");
          },
          onError: (err) => {
            setPaying(false);
            toast.error("Payment failed", err?.message || "Could not complete payment.");
          },
        }
      );
    } catch (err) {
      setPaying(false);
      toast.error("Could not resume payment", err?.message);
    }
  }, [order, toast]);

  const handleEditAddress = useCallback(() => {
    if (!order) return;
    const a = order.shippingAddress || {};
    setAddressForm({
      name: a.name || "",
      phone: a.phone || "",
      line1: a.line1 || "",
      line2: a.line2 || "",
      city: a.city || "",
      state: a.state || "",
    });
    setAddressError("");
    setEditingAddress(true);
  }, [order]);

  const handleSaveAddress = useCallback(async () => {
    if (!order) return;
    if (!addressForm.name.trim() || !addressForm.phone.trim() || !addressForm.line1.trim() || !addressForm.city.trim() || !addressForm.state.trim()) {
      setAddressError("Name, phone, address, city, and state are required.");
      return;
    }
    setSavingAddress(true);
    try {
      await updateOrderAddress(order._id, {
        name: addressForm.name.trim(),
        phone: addressForm.phone.trim(),
        line1: addressForm.line1.trim(),
        line2: addressForm.line2.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
      });
      toast.success("Address updated", "Your delivery address has been saved.");
      setEditingAddress(false);
      setTick((t) => t + 1);
    } catch (err) {
      toast.error("Update failed", err.message || "Could not update the delivery address.");
    } finally {
      setSavingAddress(false);
    }
  }, [order, addressForm, toast]);

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
          <StatusBadge status={order.orderStatus} prefix="Order" />
          <StatusBadge status={order.paymentStatus} prefix="Payment" />
          <RiskBadge level={order.riskLevel} score={order.riskScore} />
        </div>
        <p className="mt-1 text-sm text-muted">Placed {formatDateTime(order.date || order.createdAt)}</p>
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
              {order.items.map((it, idx) => (
                <li key={it.productId?._id || String(it.productId) || idx} className="flex items-center gap-4 py-3">
                  <img src={productImageUrl(it.image)} alt="" className="h-14 w-14 rounded-lg object-cover" />
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
            {canResume && (
              <Button
                onClick={handleResume}
                loading={paying}
                icon={order.paymentStatus === "failed" ? ExternalLink : CreditCard}
                className="mt-4 w-full"
              >
                {order.paymentStatus === "pending" ? "Continue payment" : "Retry payment"}
              </Button>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <MapPin className="h-4 w-4 text-brand-500" /> Delivery address
              </h2>
              {addressEditable && !editingAddress && (
                <Button variant="ghost" size="sm" icon={Pencil} onClick={handleEditAddress}>
                  Edit
                </Button>
              )}
            </div>

            {editingAddress ? (
              <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveAddress();
                }}
              >
                <TextField
                  label="Full name"
                  value={addressForm.name}
                  onChange={(e) => setAddressForm((f) => ({ ...f, name: e.target.value }))}
                />
                <TextField
                  label="Phone"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <TextField
                  label="Address line 1"
                  value={addressForm.line1}
                  onChange={(e) => setAddressForm((f) => ({ ...f, line1: e.target.value }))}
                />
                <TextField
                  label="Address line 2 (optional)"
                  value={addressForm.line2}
                  onChange={(e) => setAddressForm((f) => ({ ...f, line2: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <TextField
                    label="City"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                  />
                  <TextField
                    label="State"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))}
                  />
                </div>
                {addressError && <p className="text-xs font-medium text-red-500">{addressError}</p>}
                <div className="flex gap-2 pt-1">
                  <Button type="submit" loading={savingAddress} size="sm">
                    Save address
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={X}
                    onClick={() => setEditingAddress(false)}
                    disabled={savingAddress}
                    type="button"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-3 text-sm text-muted">
                <p className="font-medium text-ink">{order.shippingAddress?.name}</p>
                <p>{order.shippingAddress?.line1}</p>
                <p>
                  {order.shippingAddress?.city}, {order.shippingAddress?.state}
                </p>
                <p>{order.shippingAddress?.phone}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
