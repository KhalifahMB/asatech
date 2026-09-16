import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Lock,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  MapPin,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { TextField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Feedback";
import { useCart } from "@/state/CartContext";
import { useAuth } from "@/state/AuthContext";
import { formatCurrency } from "@/lib/format";
import { productImageUrl } from "@/lib/image";
import { initializePayment, launchPaystack, loadPaystackScript, verifyPayment } from "@/services/paymentService";
import { getOrder } from "@/services/orderService";
import { getAddresses, addAddress } from "@/services/authService";

const SHIPPING_FLAT = 2500;
const FREE_SHIPPING_THRESHOLD = 500000;
const CHECKOUT_KEY = "asatech-checkout";
const POLL_INTERVAL_MS = 3000;

/**
 * Generate an idempotency key scoped to one checkout attempt. It is persisted
 * with the checkout session so retries (reload, back button, double-submit)
 * reuse the same payment session instead of creating duplicate orders.
 */
function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ck-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const STEPS = [
  { key: "review", label: "Review" },
  { key: "delivery", label: "Delivery" },
  { key: "payment", label: "Payment" },
  { key: "confirmation", label: "Confirmation" },
];

function loadCheckoutSession() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.orderId ? data : null;
  } catch {
    return null;
  }
}

function saveCheckoutSession(data) {
  try {
    sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function clearCheckoutSession() {
  try {
    sessionStorage.removeItem(CHECKOUT_KEY);
  } catch {
    /* ignore */
  }
}

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const savedSession = useRef(loadCheckoutSession());

  const [step, setStep] = useState(() => {
    const s = savedSession.current;
    return s?.step || "review";
  });
  const [delivery, setDelivery] = useState(() => {
    const s = savedSession.current;
    return s?.delivery || {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      line1: "",
      line2: "",
      city: "",
      state: "",
    };
  });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [saveAddr, setSaveAddr] = useState(true);
  const [errors, setErrors] = useState({});
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(() => {
    const s = savedSession.current;
    if (s?.orderId) return { status: "pending-verification", reference: s.reference || null };
    return null;
  });
  const [orderId, setOrderId] = useState(() => savedSession.current?.orderId || null);
  const pollRef = useRef(null);

  const shipping = subtotal === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  const stepIndex = useMemo(() => STEPS.findIndex((s) => s.key === step), [step]);

  // Load the signed-in user's address book for the delivery step. Guests skip.
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    setLoadingSaved(true);
    getAddresses()
      .then((list) => {
        if (!cancelled) setSavedAddresses(list || []);
      })
      .catch(() => {
        /* address book unavailable — checkout can continue via manual form */
      })
      .finally(() => {
        if (!cancelled) setLoadingSaved(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasPendingOrder = Boolean(orderId);
  if (items.length === 0 && step !== "confirmation" && !hasPendingOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          title="Nothing to check out"
          description="Your cart is empty. Add some gadgets first."
          action={<Button to="/products">Browse products</Button>}
        />
      </div>
    );
  }

  const validateDelivery = () => {
    const e = {};
    if (!delivery.name.trim()) e.name = "Full name is required.";
    if (!delivery.email.trim()) e.email = "Email is required.";
    if (delivery.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(delivery.email))
      e.email = "Enter a valid email.";
    if (!delivery.phone.trim()) e.phone = "Phone number is required.";
    if (!delivery.line1.trim()) e.line1 = "Address is required.";
    if (!delivery.city.trim()) e.city = "City is required.";
    if (!delivery.state.trim()) e.state = "State is required.";
    return e;
  };

  const nextFromDelivery = () => {
    const e = validateDelivery();
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep("payment");
  };

  /** Fill the delivery form from a saved address book entry. */
  const applySavedAddress = (addr) => {
    setDelivery((d) => ({
      ...d,
      name: addr.name || d.name,
      phone: addr.phone || d.phone,
      line1: addr.line1,
      line2: addr.line2 || "",
      city: addr.city,
      state: addr.state,
    }));
    setErrors({});
  };

  /** Persist the entered delivery address to the user's address book. */
  const persistAddressIfRequested = () => {
    if (!user || !saveAddr || !delivery.line1 || !delivery.city || !delivery.state) return;
    addAddress({
      label: "Home",
      name: delivery.name,
      line1: delivery.line1,
      line2: delivery.line2 || "",
      city: delivery.city,
      state: delivery.state,
      phone: delivery.phone,
      default: false,
    }).catch(() => {
      /* best-effort save — never block checkout on this */
    });
  };

  const handlePay = async () => {
    setPaying(true);
    setPayError("");
    try {
      await loadPaystackScript();
      // One idempotency key per checkout attempt — persisted with the session
      // so a retry reuses the exact same order + Paystack reference.
      const idempotencyKey =
        savedSession.current?.idempotencyKey || makeIdempotencyKey();
      const init = await initializePayment({
        email: delivery.email,
        amount: total,
        currency: "NGN",
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shipping: { name: delivery.name, ...delivery },
        idempotencyKey,
      });

      const newOrderId = init?.metadata?.orderId;
      const ref = init?.reference;
      if (newOrderId) {
        setOrderId(newOrderId);
        saveCheckoutSession({
          orderId: newOrderId,
          reference: ref,
          step: "confirmation",
          delivery,
          idempotencyKey,
        });
      }

      launchPaystack(
        {
          key: init?.publicKey,
          email: delivery.email,
          amount: init?.amount ?? total * 100,
          reference: init?.reference,
          currency: init?.currency || "NGN",
          metadata: init?.metadata,
        },
        {
          onSuccess: (response) => {
            setPaying(false);
            persistAddressIfRequested();
            setResult({ status: "pending-verification", reference: response?.reference });
            setStep("confirmation");
            if (newOrderId)
              saveCheckoutSession({
                orderId: newOrderId,
                reference: response?.reference,
                step: "confirmation",
                delivery,
                idempotencyKey,
              });
          },
          onClose: () => {
            setPaying(false);
            setPayError("Payment was cancelled. You can retry when ready.");
            setStep("payment");
          },
          onError: (err) => {
            setPaying(false);
            setPayError(err?.message || "Payment could not be completed.");
            setStep("payment");
          },
        }
      );
    } catch (err) {
      setPaying(false);
      setPayError(
        err?.message || "Payment could not be initialised. Please try again."
      );
      setStep("payment");
    }
  };

  // ── Poll backend for payment status ──────────────────────────────────
  // Prefers the on-demand verify endpoint so a payment that succeeded on
  // Paystack is reconciled server-side even if the webhook never arrived.
  // Falls back to reading the order directly when no reference is available.
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (result?.status !== "pending-verification") {
      return undefined;
    }

    const reference = result?.reference;
    if (!reference) {
      // No Paystack reference — fall back to checking the order status directly
      if (!orderId) return undefined;

      let cancelled = false;
      pollRef.current = setInterval(async () => {
        try {
          const order = await getOrder(orderId);
          if (cancelled) return;

          if (order?.paymentStatus === "paid") {
            stopPolling();
            setResult({ status: "confirmed", reference: order.paymentRef });
            clearCheckoutSession();
            clear();
          } else if (order?.paymentStatus === "failed" || order?.paymentStatus === "cancelled") {
            stopPolling();
            setResult({ status: "failed", reference: order.paymentRef });
            clearCheckoutSession();
          }
        } catch (err) {
          if (err?.status === 404) {
            stopPolling();
            setResult({ status: "failed", reference: null });
            clearCheckoutSession();
          }
        }
      }, POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        stopPolling();
      };
    }

    let cancelled = false;

    pollRef.current = setInterval(async () => {
      try {
        const res = await verifyPayment(reference);
        if (cancelled) return;

        const transactionStatus = res?.transactionStatus;
        const paymentStatus = res?.paymentStatus;

        if (transactionStatus === "successful" || paymentStatus === "paid") {
          stopPolling();
          setResult({ status: "confirmed", reference: res?.reference || reference });
          clearCheckoutSession();
          clear();
        } else if (
          transactionStatus === "failed" ||
          paymentStatus === "failed" ||
          paymentStatus === "cancelled"
        ) {
          stopPolling();
          setResult({ status: "failed", reference: res?.reference || reference });
          clearCheckoutSession();
        }
      } catch (err) {
        if (err?.status === 404) {
          stopPolling();
          setResult({ status: "failed", reference });
          clearCheckoutSession();
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [result?.status, result?.reference, orderId, clear, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const finish = () => {
    clearCheckoutSession();
    if (items.length > 0) clear();
    navigate("/account/orders");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Checkout</h1>

      <ol className="mt-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i < stepIndex || step === "confirmation"
                  ? "bg-brand-600 text-white"
                  : i === stepIndex
                  ? "border-2 border-brand-500 text-brand-500"
                  : "border border-line text-faint"
              }`}
            >
              {i < stepIndex || step === "confirmation" ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={`hidden text-xs font-medium sm:block ${
                i <= stepIndex ? "text-ink" : "text-faint"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {step === "review" && (
            <Card className="divide-y divide-line">
              {items.map((i) => (
                <div key={i.productId} className="flex items-center gap-4 p-4">
                  <img src={productImageUrl(i.image)} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{i.name}</p>
                    <p className="text-xs text-muted">Qty {i.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    {formatCurrency(i.price * i.quantity)}
                  </p>
                </div>
              ))}
              <div className="flex justify-end p-4">
                <Button onClick={() => setStep("delivery")} iconRight={ArrowRight}>
                  Continue to delivery
                </Button>
              </div>
            </Card>
          )}

          {step === "delivery" && (
            <Card className="p-5">
              <h2 className="text-base font-semibold text-ink">Delivery information</h2>

              {user && savedAddresses.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-ink">Saved addresses</p>
                  <p className="text-xs text-muted">Pick one to fill the form or enter a new one below.</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr._id}
                        type="button"
                        onClick={() => applySavedAddress(addr)}
                        className={`group rounded-xl border p-3 text-left transition ${
                          addr.default
                            ? "border-brand-500/60 bg-brand-500/5 hover:bg-brand-500/10"
                            : "border-line bg-raised hover:border-brand-500/40"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                          <MapPin className="h-3.5 w-3.5 text-brand-500" />
                          {addr.label || "Home"}
                          {addr.default && (
                            <Star className="h-3 w-3 fill-brand-500 text-brand-500" aria-label="Default address" />
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {addr.name} · {addr.line1}, {addr.city}, {addr.state}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loadingSaved && (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading saved addresses…
                </p>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Full name"
                  value={delivery.name}
                  onChange={(e) => setDelivery((d) => ({ ...d, name: e.target.value }))}
                  error={errors.name}
                  required
                />
                <TextField
                  label="Phone number"
                  value={delivery.phone}
                  onChange={(e) => setDelivery((d) => ({ ...d, phone: e.target.value }))}
                  error={errors.phone}
                  required
                />
                <div className="sm:col-span-2">
                  <TextField
                    label="Email address"
                    type="email"
                    value={delivery.email}
                    onChange={(e) => setDelivery((d) => ({ ...d, email: e.target.value }))}
                    error={errors.email}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <TextField
                    label="Delivery address"
                    value={delivery.line1}
                    onChange={(e) => setDelivery((d) => ({ ...d, line1: e.target.value }))}
                    error={errors.line1}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <TextField
                    label="Address line 2 (optional)"
                    value={delivery.line2}
                    onChange={(e) => setDelivery((d) => ({ ...d, line2: e.target.value }))}
                  />
                </div>
                <TextField
                  label="City"
                  value={delivery.city}
                  onChange={(e) => setDelivery((d) => ({ ...d, city: e.target.value }))}
                  error={errors.city}
                  required
                />
                <TextField
                  label="State"
                  value={delivery.state}
                  onChange={(e) => setDelivery((d) => ({ ...d, state: e.target.value }))}
                  error={errors.state}
                  required
                />
              </div>

              {user && (
                <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={saveAddr}
                    onChange={(e) => setSaveAddr(e.target.checked)}
                  />
                  Save this address to my address book
                </label>
              )}

              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setStep("review")} icon={ArrowLeft}>
                  Back
                </Button>
                <Button onClick={nextFromDelivery} iconRight={ArrowRight}>
                  Continue to payment
                </Button>
              </div>
            </Card>
          )}

          {step === "payment" && (
            <Card className="p-5">
              <h2 className="text-base font-semibold text-ink">Payment</h2>
              <p className="mt-1 text-sm text-muted">
                You'll be redirected to a secure Paystack checkout to complete your purchase.
              </p>

              {payError && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-500">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              <div className="mt-5 space-y-3 rounded-xl border border-line bg-raised p-4 text-sm">
                <div className="flex items-center gap-2 font-medium text-ink">
                  <CreditCard className="h-4 w-4 text-brand-500" /> Pay with Paystack
                </div>
                <p className="text-xs text-muted">
                  Amount: <span className="font-semibold text-ink">{formatCurrency(total)}</span> ·{" "}
                  {delivery.email}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-faint">
                <Lock className="h-3.5 w-3.5" /> Your payment details are handled by Paystack — we
                never store your card.
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setStep("delivery")} icon={ArrowLeft}>
                  Back
                </Button>
                <Button onClick={handlePay} loading={paying} icon={ShieldCheck}>
                  Pay {formatCurrency(total)}
                </Button>
              </div>
            </Card>
          )}

          {step === "confirmation" && (
            <Card className="p-6 text-center">
              {result?.status === "pending-verification" && (
                <>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                    <Loader2 className="h-7 w-7 animate-spin" />
                  </span>
                  <h2 className="mt-5 text-xl font-bold text-ink">Verifying payment</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                    We're confirming your payment with Paystack. This usually takes a few seconds.
                    You can safely stay on this page.
                  </p>
                </>
              )}

              {result?.status === "confirmed" && (
                <>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-7 w-7" />
                  </span>
                  <h2 className="mt-5 text-xl font-bold text-ink">Order confirmed</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                    Thank you for your order. A confirmation email has been sent to {delivery.email}.
                  </p>
                </>
              )}

              {result?.status === "failed" && (
                <>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                    <XCircle className="h-7 w-7" />
                  </span>
                  <h2 className="mt-5 text-xl font-bold text-ink">Payment not completed</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                    We couldn't verify your payment. Your cart items are still saved. You can retry
                    or contact support if you were charged.
                  </p>
                </>
              )}

              <div className="mt-6 flex justify-center gap-3">
                {result?.status === "failed" ? (
                  <>
                    <Button onClick={() => { setResult(null); setStep("payment"); }} icon={ArrowLeft}>
                      Retry payment
                    </Button>
                    <Button variant="ghost" to="/account/orders">
                      View orders
                    </Button>
                  </>
                ) : (
                  <Button onClick={finish} disabled={result?.status === "pending-verification"}>
                    {result?.status === "pending-verification" ? "Processing..." : "View my orders"}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card className="sticky top-20 p-5">
            <h3 className="text-base font-semibold text-ink">Summary</h3>
            <ul className="mt-3 space-y-2">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between text-sm">
                  <span className="text-muted">
                    {i.name} × {i.quantity}
                  </span>
                  <span className="text-ink">{formatCurrency(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-ink">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="text-ink">{shipping === 0 ? "Free" : formatCurrency(shipping)}</dd>
              </div>
              <div className="flex justify-between text-base font-bold text-ink">
                <dt>Total</dt>
                <dd>{formatCurrency(total)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-faint">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" /> Secure checkout
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
