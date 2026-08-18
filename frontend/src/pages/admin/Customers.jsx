import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Surfaces";
import { StatusBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { listCustomers } from "@/services/adminService";
import { formatCurrency, formatDate, initials } from "@/lib/format";

export default function Customers() {
  const { data: customers, loading } = useAsync(() => listCustomers({}), []);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = (customers || []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Customers" subtitle="Registered customer accounts." />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="h-10 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm text-ink placeholder:text-faint"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {filtered.map((c) => (
              <li key={c.id}>
                <button onClick={() => setSelected(c)} className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-raised sm:px-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-500">
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                    <p className="truncate text-xs text-muted">{c.email}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold text-ink">{c.orders} orders</p>
                    <p className="text-xs text-muted">{formatCurrency(c.totalSpent)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="xs" fullWidth>
        {selected && (
          <>
            <DialogTitle className="flex items-center justify-between pr-2">
              <span className="text-base font-semibold">Customer details</span>
              <IconButton onClick={() => setSelected(null)} size="small" aria-label="Close">
                <X className="h-4 w-4" />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 text-base font-bold text-brand-500">
                  {initials(selected.name)}
                </span>
                <div>
                  <p className="font-semibold text-ink">{selected.name}</p>
                  <p className="text-sm text-muted">{selected.email}</p>
                </div>
              </div>
              <dl className="mt-5 space-y-2.5 text-sm">
                {[
                  ["Phone", selected.phone],
                  ["Joined", formatDate(selected.joined)],
                  ["Orders", `${selected.orders}`],
                  ["Total spent", formatCurrency(selected.totalSpent)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-medium text-ink">{v}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Status</dt>
                  <dd><StatusBadge status={selected.status} /></dd>
                </div>
              </dl>
            </DialogContent>
          </>
        )}
      </Dialog>
    </div>
  );
}
