import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Surfaces";
import { StatusBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { SelectField } from "@/components/ui/Field";
import { useAsync } from "@/hooks/useAsync";
import { listAuditLogs } from "@/services/adminService";
import { formatDateTime } from "@/lib/format";

export default function AuditLogs() {
  const { data: logs, loading } = useAsync(() => listAuditLogs({}), []);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [selected, setSelected] = useState(null);

  const actions = ["all", ...Array.from(new Set((logs || []).map((l) => l.action)))];

  const filtered = (logs || []).filter((l) => {
    if (action !== "all" && l.action !== action) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.actor.toLowerCase().includes(q) ||
        l.resource.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Audit logs" subtitle="A record of administrative and system activity." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs…"
            className="h-10 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm text-ink placeholder:text-faint"
          />
        </div>
        <div className="w-full sm:w-56">
          <SelectField
            label="Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={actions.map((a) => ({ value: a, label: a === "all" ? "All actions" : a }))}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No audit logs found" />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {filtered.map((l) => (
              <li key={l.id}>
                <button onClick={() => setSelected(l)} className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-raised sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      <span className="font-semibold">{l.actor}</span> · {l.action}
                    </p>
                    <p className="truncate text-xs text-muted">{l.resource} · {formatDateTime(l.timestamp)}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle className="flex items-center justify-between pr-2">
              <span className="text-base font-semibold">Log details</span>
              <IconButton onClick={() => setSelected(null)} size="small" aria-label="Close">
                <X className="h-4 w-4" />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <dl className="space-y-3 text-sm">
                {[
                  ["Timestamp", formatDateTime(selected.timestamp)],
                  ["Actor", selected.actor],
                  ["Role", selected.actorRole],
                  ["Action", selected.action],
                  ["Resource", selected.resource],
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
                {selected.detail && (
                  <div className="rounded-lg bg-raised p-3 text-sm text-muted">{selected.detail}</div>
                )}
              </dl>
            </DialogContent>
          </>
        )}
      </Dialog>
    </div>
  );
}
