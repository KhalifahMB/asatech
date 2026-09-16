import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock3,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { getOrder } from "@/services/orderService";
import { verifyPayment } from "@/services/paymentService";
import { formatCurrency, formatDateTime } from "@/lib/format";

const POLL_INTERVAL_MS = 4000;

/**
 * Payment success screen — where Paystack redirects customers after checkout
 * (`/payment/:orderId/success`, see initializePayment callback_url).
 *
 * Confirms the payment server-side: it finds the transaction's Paystack
 * reference, asks the backend to verify it (and settle the order if it
 * succeeded), and only then shows success. If verification hits a still-pending
 * Paystack status it polls a few times before offering a manual check.
 */
export default function PaymentSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState("loading"); // loading | paid | failed | pending
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const o = await getOrder(orderId);

      if (o?.paymentStatus === "paid") {
        setOrder(o);
        setState("paid");
        return;
      }

      const ref =
        o?.paymentRef ||
        o?.transactionId?.paystackReference ||
        o?.transactionId?.reference;

      if (!ref) {
        setOrder(o);
        setState(o?.paymentStatus === "failed" ? "failed" : "failed");
        if (o?.paymentStatus !== "failed") {
          setError("No payment session was found for this order.");
        }
        return;
      }

      const res = await verifyPayment(ref);

      if (
        res?.transactionStatus === "successful" ||
        res?.paymentStatus === "paid"
      ) {
        const refreshed = await getOrder(orderId).catch(() => o);
        setOrder(refreshed || o);
        setState("paid");
      } else if (
        res?.transactionStatus === "failed" ||
        res?.paymentStatus === "failed"
      ) {
        setOrder(o);
        setState("failed");
      } else {
        // Still in flight server-side. Poll a couple of times; the webhook or
        // Paystack may not have settled yet.
        setOrder(o);
        let stillPending = true;
        for (let attempt = 0; attempt < 15; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          const next = await verifyPayment(ref).catch(() => null);
          if (!next) continue;
          if (
            next?.transactionStatus === "successful" ||
            next?.paymentStatus === "paid"
          ) {
            const refreshed = await getOrder(orderId).catch(() => o);
            setOrder(refreshed || o);
            setState("paid");
            stillPending = false;
            break;
          }
          if (next?.transactionStatus === "failed") {
            setOrder(o);
            setState("failed");
            stillPending = false;
            break;
          }
        }
        if (stillPending) setState("pending");
      }
    } catch (err) {
      setError(err?.message || "We couldn't load your payment status.");
      setState("failed");
    }
  }, [orderId]);

  useEffect(() => {
    run();
  }, [run]);

  const icons = {
    paid: <CheckCircle2 className="h-9 w-9" />,
    failed: <XCircle className="h-9 w-9" />,
    pending: <Clock3 className="h-9 w-9" />,
    loading: <Loader2 className="h-9 w-9 animate-spin" />,
  };

  const iconTones = {
    paid: "bg-emerald-500/10 text-emerald-500",
    failed: "bg-red-500/10 text-red-500",
    pending: "bg-amber-500/10 text-amber-500",
    loading: "bg-brand-500/10 text-brand-500",
  };

  const headings = {
    paid: "Payment confirmed",
    failed: "Payment not confirmed",
    pending: "Payment is still processing",
    loading: "Verifying your payment",
  };

  const descriptions = {
    paid: "Thank you — your order has been confirmed and a receipt has been emailed to you.",
    failed:
      error ||
      "We couldn't confirm this payment. If you were charged but see this screen, contact support and we'll reconcile it right away.",
    pending:
      "Paystack hasn't finalized this payment yet. Give it a few more seconds or check again below.",
    loading: "We're confirming the payment with Paystack. This usually takes a moment.",
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <Card className="overflow-hidden">
        <div className="p-8 text-center">
          <span
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${iconTones[state]}`}
          >
            {icons[state]}
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">
            {headings[state]}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            {descriptions[state]}
          </p>

          {order && (
            <dl className="mx-auto mt-6 max-w-sm space-y-2 rounded-xl border border-line bg-raised p-4 text-left text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Order</dt>
                <dd className="font-semibold text-ink">{order.ref}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Total</dt>
                <dd className="font-semibold text-ink">
                  {formatCurrency(order.total)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Placed</dt>
                <dd className="font-medium text-ink">
                  {formatDateTime(order.date || order.createdAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Payment</dt>
                <dd>
                  <StatusBadge status={order.paymentStatus} prefix="Payment" />
                </dd>
              </div>
            </dl>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {state === "paid" && (
              <Button
                to={{
                  pathname: `/account/orders/${orderId}`,
                }}
                iconRight={ArrowRight}
              >
                View order
              </Button>
            )}
            {state === "pending" && (
              <Button onClick={run} iconRight={ArrowRight}>
                Check again
              </Button>
            )}
            {state === "failed" && (
              <Button onClick={run}>Try again</Button>
            )}
            <Button variant="ghost" to="/account/orders">
              Your orders
            </Button>
            <Button variant="ghost" to="/products">
              Continue shopping
            </Button>
          </div>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-faint">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
            Payment status is confirmed directly with Paystack — never your
            browser.
          </p>
        </div>
      </Card>
    </div>
  );
}