import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Loader2, ExternalLink, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const STAGES = {
  initializing: {
    label: "Initializing payment",
    detail: "Contacting our payment gateway…",
    step: 0,
  },
  handoff: {
    label: "Starting secure payment",
    detail: "We opened a secure payment window in a new tab. Complete it there — we'll verify automatically.",
    step: 1,
  },
  verifying: {
    label: "Verifying payment",
    detail: "Confirming your payment with our payment provider. This usually takes a few seconds.",
    step: 2,
  },
  confirmed: {
    label: "Payment confirmed",
    detail: "Your order has been placed. Thank you!",
    step: 3,
  },
  failed: {
    label: "Payment unsuccessful",
    detail: "We couldn't verify your payment. You can retry or check your order.",
    step: 3,
  },
};

/**
 * In-app payment progress modal.
 *
 * Replaces the previous full-page Paystack iframe overlay that could render as
 * a blank white screen. The host page stays mounted behind this modal while the
 * payment is initialized, handed off to a new-tab checkout, and verified.
 */
export default function PaymentModal({ open, status, email, onRetry, onClose }) {
  const s = STAGES[status] || STAGES.initializing;

  return (
    <Modal open={open} onClose={status === "confirmed" || status === "failed" ? onClose : undefined} title={s.label} titleIcon={null}>
      <div className="space-y-5 py-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
            {status === "confirmed" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : status === "failed" ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{s.label}</p>
            <p className="text-xs text-muted">{s.detail}</p>
          </div>
        </div>

        {/* Progress track */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= s.step ? "bg-brand-500" : "bg-line"
              }`}
            />
          ))}
        </div>

        {(status === "handoff" || status === "verifying") && email && (
          <p className="text-xs text-faint">Paying as: {email}</p>
        )}

        {status === "failed" && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-500">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Your payment could not be verified. Nothing was charged if you didn't complete it.</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {status === "failed" && (
            <Button onClick={onRetry} icon={RefreshCw}>
              Retry payment
            </Button>
          )}
          {(status === "confirmed" || status === "failed") && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
