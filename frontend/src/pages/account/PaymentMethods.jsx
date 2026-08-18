import { CreditCard, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Surfaces";

/**
 * Payment methods are managed by Paystack during checkout.
 * ASATECH never stores card details — card management would connect to
 * Paystack's Customer/Authorization API once backend support is added.
 */
export default function PaymentMethods() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Payment methods</h1>
        <p className="mt-1 text-sm text-muted">
          Cards you use for checkout are handled securely by Paystack.
        </p>
      </div>

      <Card className="flex items-start gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">Your cards are never stored on ASATECH</p>
          <p className="mt-1 text-sm text-muted">
            All payment details are handled directly by Paystack, our PCI-DSS-certified payment
            processor. You'll be prompted to enter card details each time you check out.
          </p>
        </div>
      </Card>

      <EmptyState
        icon={CreditCard}
        title="No saved payment methods"
        description="Payment method management will be available soon."
      />
    </div>
  );
}
