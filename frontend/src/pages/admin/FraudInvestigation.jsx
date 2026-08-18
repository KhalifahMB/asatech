import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Check, X, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, RiskBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { ScoreBar } from "@/components/charts";
import { useToast } from "@/state/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { getFraudAlert, updateFraudAlert } from "@/services/fraudService";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { RISK_FACTORS } from "@/lib/constants";

export default function FraudInvestigation() {
  const { id } = useParams();
  const toast = useToast();
  const { data: alert, loading } = useAsync(() => getFraudAlert(id), [id]);
  const [status, setStatus] = useState(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!alert) {
    return (
      <EmptyState
        title="Alert not found"
        action={<Link to="/admin/fraud-alerts" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Back to alerts</Link>}
      />
    );
  }

  // Transaction and order data come populated on the alert from the API
  const txn = typeof alert.transactionId === "object" ? alert.transactionId : null;
  const order = typeof alert.orderId === "object" ? alert.orderId : null;

  const act = async (next) => {
    setStatus(next);
    await updateFraudAlert(alert.id, { status: next });
    toast.success("Alert updated", `Marked as “${next.replace("-", " ")}”.`);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={alert.id.toUpperCase()}
        subtitle="Fraud investigation"
        breadcrumbs={[{ label: "Fraud alerts", to: "/admin/fraud-alerts" }, { label: alert.id.toUpperCase() }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => act("under-review")} icon={Clock}>
              Under review
            </Button>
            <Button variant="primary" onClick={() => act("approved")} icon={Check} className="!bg-emerald-600 hover:!bg-emerald-700">
              Approve
            </Button>
            <Button variant="danger" onClick={() => act("rejected")} icon={X}>
              Reject
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <RiskBadge level={alert.severity} score={alert.riskScore} />
        <StatusBadge status={status || alert.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Risk score */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Risk score</h2>
            <div className="mt-4 flex items-center gap-4">
              <span className="text-4xl font-extrabold tracking-tight text-ink">{alert.riskScore}</span>
              <div className="flex-1">
                <ScoreBar score={alert.riskScore} />
                <p className="mt-2 text-xs text-muted">
                  Provided by the backend fraud engine — not computed in the browser.
                </p>
              </div>
            </div>
          </Card>

          {/* Risk factors */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Risk factors</h2>
            <ul className="mt-4 space-y-2.5">
              {RISK_FACTORS.map((f) => {
                const flagged = alert.factors.includes(f);
                return (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${flagged ? "bg-red-500/15 text-red-500" : "bg-raised text-faint"}`}>
                      {flagged ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                    </span>
                    <span className={flagged ? "text-ink" : "text-faint"}>{f}</span>
                    {flagged && <span className="ml-auto text-xs font-medium text-red-500">Flagged</span>}
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Transaction metadata */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Transaction metadata</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Transaction", txn?.reference || alert.txnRef],
                ["Order", alert.orderRef || "—"],
                ["Amount", formatCurrency(alert.amount)],
                ["Date", txn ? formatDateTime(txn.date) : formatDateTime(alert.createdAt)],
                ["Channel", txn ? txn.channel.toUpperCase() : "—"],
                ["Method", txn?.method || "Paystack"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Customer */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Customer</h2>
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-semibold text-ink">{alert.customerName}</p>
              <p className="text-muted">Customer account associated with this transaction.</p>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Investigation timeline</h2>
            <ol className="mt-4 space-y-4">
              {[
                { label: "Transaction flagged", at: alert.createdAt },
                { label: "Risk assessment", at: alert.createdAt, done: true },
                { label: "Current status", at: alert.createdAt, done: alert.status !== "new" },
              ].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${i === 0 ? "bg-red-500" : t.done ? "bg-brand-500" : "bg-faint"}`} />
                  <div>
                    <p className="text-sm font-medium text-ink">{t.label}</p>
                    <p className="text-xs text-muted">{formatDateTime(t.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Current decision</h2>
            <div className="mt-3">
              <StatusBadge status={status || alert.status} />
              <p className="mt-3 text-sm text-muted">
                Use the actions above to approve, reject, or move this alert under review.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
