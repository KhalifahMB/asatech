import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { X, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/Surfaces";
import { StatusBadge, RiskBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { SelectField } from "@/components/ui/Field";
import { useAuth } from "@/state/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { listTransactions } from "@/services/orderService";
import { formatCurrency, formatDateTime } from "@/lib/format";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "successful", label: "Successful" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
];

export default function Transactions() {
  const { user } = useAuth();
  const { data: txs, loading } = useAsync(() => listTransactions({ customerId: user?.id }), [user?.id]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = (txs || []).filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.reference.toLowerCase().includes(q) ||
        t.orderRef.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Transactions</h1>
        <p className="mt-1 text-sm text-muted">Your payment history and statuses.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference…"
            className="h-10 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm text-ink placeholder:text-faint"
          />
        </div>
        <div className="w-full sm:w-40">
          <SelectField label="Status" value={filter} onChange={(e) => setFilter(e.target.value)} options={FILTERS} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="No transactions" description="No transactions match your search." />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint sm:grid">
            <span>Reference</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Risk</span>
            <span className="text-right">Status</span>
          </div>
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="grid w-full grid-cols-2 gap-2 px-5 py-3.5 text-left transition hover:bg-raised sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4"
            >
              <span className="col-span-2 font-mono text-xs font-semibold text-ink sm:col-span-1">
                {t.reference}
              </span>
              <span className="text-xs text-muted">{formatDateTime(t.date)}</span>
              <span className="text-sm font-semibold text-ink">{formatCurrency(t.amount)}</span>
              <span><RiskBadge level={t.riskLevel} score={t.riskScore} /></span>
              <span className="justify-self-end"><StatusBadge status={t.status} /></span>
            </button>
          ))}
        </Card>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="xs" fullWidth>
        {selected && (
          <>
            <DialogTitle className="flex items-center justify-between pr-2">
              <span className="text-base font-semibold">Transaction details</span>
              <IconButton onClick={() => setSelected(null)} size="small" aria-label="Close">
                <X className="h-4 w-4" />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <dl className="space-y-3 text-sm">
                {[
                  ["Reference", selected.reference],
                  ["Order", selected.orderRef],
                  ["Date", formatDateTime(selected.date)],
                  ["Amount", formatCurrency(selected.amount)],
                  ["Channel", selected.channel.toUpperCase()],
                  ["Method", selected.method],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-medium text-ink">{v}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Status</dt>
                  <dd><StatusBadge status={selected.status} /></dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Risk</dt>
                  <dd><RiskBadge level={selected.riskLevel} score={selected.riskScore} /></dd>
                </div>
              </dl>
            </DialogContent>
          </>
        )}
      </Dialog>
    </div>
  );
}
