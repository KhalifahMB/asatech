import { useMemo, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { TextField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Feedback";
import { useCart } from "@/state/CartContext";
import { useAuth } from "@/state/AuthContext";
import { formatCurrency } from "@/lib/format";
import { initializePayment, launchPaystack, loadPaystackScript } from "@/services/paymentService";

const SHIPPING_FLAT = 2500;
const FREE_SHIPPING_THRESHOLD = 500000;

const STEPS = [
  { key: "review", label: "Review" },
  { key: "delivery", label: "Delivery" },
  { key: "payment", label: "Payment" },
  { key: "confirmation", label: "Confirmation" },
];

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("review");
  const [delivery, setDelivery] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    line1: "",
    city: "",
    state: "",
  });
  const [errors, setErrors] = useState({});
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null);

  const shipping = subtotal === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  const stepIndex = useMemo(() => STEPS.findIndex((s) => s.key === step), [step]);

  if (items.length === 0 && step !== "confirmation") {
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

  /**
   * Payment is initiated against POST /payments/initialize via paymentService.
   * There is no mocked success path: if the backend is not configured, the
   * error is surfaced honestly to the customer.
   */
  const handlePay = async () => {
    setPaying(true);
    setPayError("");
    try {
      await loadPaystackScript();
      // The payload/contract below is adaptable to the backend schema.
      const init = await initializePayment({
        email: delivery.email,
        amount: total, // backend normalises to the unit Paystack expects (kobo)
        currency: "NGN",
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shipping: { name: delivery.name, ...delivery },
      });

      launchPaystack(
        {
          email: delivery.email,
          amount: init?.amount ?? total * 100,
          reference: init?.reference,
          currency: init?.currency || "NGN",
          metadata: init?.metadata,
        },
        {
          onSuccess: (response) => {
            // Paystack finished; VERIFICATION is the backend's responsibility.
            // The frontend waits for the backend to return a final order state.
            setResult({ status: "pending-verification", reference: response?.reference });
            setStep("confirmation");
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

  const finish = () => {
    clear();
    navigate("/account/orders");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Checkout</h1>

      {/* Stepper */}
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
          {/* Step 1 — Review */}
          {step === "review" && (
            <Card className="divide-y divide-line">
              {items.map((i) => (
                <div key={i.productId} className="flex items-center gap-4 p-4">
                  <img src={i.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
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

          {/* Step 2 — Delivery */}
          {step === "delivery" && (
            <Card className="p-5">
              <h2 className="text-base font-semibold text-ink">Delivery information</h2>
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

          {/* Step 3 — Payment */}
          {step === "payment" && (
            <Card className="p-5">
              <h2 className="text-base font-semibold text-ink">Payment</h2>
              <p className="mt-1 text-sm text-muted">
                You’ll be redirected to a secure Paystack checkout to complete your purchase.
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
                  Amount: <span className="font-semibold text-ink">{formatCurrency(total)}</span> ·
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

          {/* Step 4 — Confirmation */}
          {step === "confirmation" && (
            <Card className="p-6 text-center">
              {result?.status === "pending-verification" ? (
                <>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                    <Loader2 className="h-7 w-7 animate-spin" />
                  </span>
                  <h2 className="mt-5 text-xl font-bold text-ink">Payment received</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                    Your payment is being verified. Order confirmation happens on the backend once
                    verification completes.
                  </p>
                </>
              ) : (
                <>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-7 w-7" />
                  </span>
                  <h2 className="mt-5 text-xl font-bold text-ink">Order confirmed</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                    Thank you for your order. A confirmation with your order reference will be sent
                    to {delivery.email}.
                  </p>
                </>
              )}
              <Button onClick={finish} className="mt-6">
                View my orders
              </Button>
            </Card>
          )}
        </div>

        {/* Order summary */}
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
