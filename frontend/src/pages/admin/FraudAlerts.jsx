import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Surfaces";
import { StatusBadge, RiskBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { SelectField } from "@/components/ui/Field";
import { useAsync } from "@/hooks/useAsync";
import { listFraudAlerts } from "@/services/fraudService";
import { FRAUD_ALERT_STATUSES } from "@/lib/constants";
import { formatCurrency, formatRelative } from "@/lib/format";

export default function FraudAlerts() {
  const { data: alerts, loading } = useAsync(() => listFraudAlerts({}), []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = (alerts || []).filter((a) => {
    if (status !== "all" && a.status !== status) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.customerName.toLowerCase().includes(q) || a.txnRef.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Fraud alerts"
        subtitle="Suspicious transactions flagged by the risk engine."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or reference…"
            className="h-10 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm text-ink placeholder:text-faint"
          />
        </div>
        <div className="w-full sm:w-48">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "all", label: "All" },
              ...FRAUD_ALERT_STATUSES.map((s) => ({ value: s, label: s.replace("-", " ")[0].toUpperCase() + s.replace("-", " ").slice(1) })),
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No fraud alerts" description="No alerts match your filters." />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Link key={a.id} to={`/admin/fraud-alerts/${a.id}`} className="block">
              <Card className="p-4 transition hover:border-brand-500/40 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.severity === "high" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>
                      <ShieldAlert className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{a.customerName}</p>
                      <p className="text-xs text-muted">{a.txnRef} · {formatCurrency(a.amount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <RiskBadge level={a.severity} score={a.riskScore} />
                    <StatusBadge status={a.status} />
                    <span className="hidden text-xs text-faint sm:block">{formatRelative(a.createdAt)}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.factors.map((f) => (
                    <span key={f} className="rounded-md bg-raised px-2 py-0.5 text-xs text-muted">{f}</span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
