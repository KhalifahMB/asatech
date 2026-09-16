import { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper } from "@mui/material";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, RiskBadge } from "@/components/ui/Badges";
import { Card } from "@/components/ui/Surfaces";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { SelectField } from "@/components/ui/Field";
import { useToast } from "@/state/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { listTransactions } from "@/services/orderService";
import { syncTransactions } from "@/services/adminService";
import { formatCurrency, formatDateTime } from "@/lib/format";

/**
 * Reconcile unsettled payments directly with Paystack — the no-terminal
 * equivalent of `node backend/src/scripts/verifyTransactions.js`. Fixes
 * payments that succeeded on Paystack but were never settled (webhook missed
 * or delayed) so they stop showing "Pending" forever.
 */
async function runSync({ onStart, onDone, onError }) {
  onStart();
  try {
    const summary = await syncTransactions();
    onDone(summary);
  } catch (err) {
    onError(err);
  }
}

export default function AdminTransactions() {
  const toast = useToast();
  const [version, setVersion] = useState(0);
  const { data: txs, loading } = useAsync(() => listTransactions({}), [version]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState(null);

  const filtered = (txs || []).filter((t) => {
    if (status !== "all" && t.status !== status) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.reference.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSync = () => {
    runSync({
      onStart: () => setSyncing(true),
      onDone: (res) => {
        setSyncing(false);
        setSummary(res);
        setVersion((v) => v + 1);
        toast.success(
          `Reconciled ${res.scanned ?? 0} transaction(s) — ${res.successful ?? 0} settled, ${res.failed ?? 0} failed`
        );
      },
      onError: (err) => {
        setSyncing(false);
        toast.error(err?.message || "Reconciliation failed. Check the backend logs.");
      },
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="All payment transactions across the platform."
        actions={
          <Button onClick={handleSync} loading={syncing} icon={RefreshCw}>
            Reconcile payments
          </Button>
        }
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium text-ink">
            {summary
              ? `Last run — scanned ${summary.scanned ?? 0}, settled ${summary.successful ?? 0}, failed ${summary.failed ?? 0}, errors ${summary.errors ?? 0}`
              : "Payments that were confirmed by Paystack but never settled stay stuck on Pending"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Reconcile asks Paystack directly about every pending transaction and updates it (and its
            order) automatically. Replaces
            <span className="font-mono text-faint"> node backend/src/scripts/verifyTransactions.js</span>
            {" "}from the terminal.
          </p>
        </div>
        {summary?.errors > 0 && (
          <span className="shrink-0 text-xs font-semibold text-red-500">
            {summary.errors} error(s) — check backend logs
          </span>
        )}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference or customer…"
            className="h-10 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm text-ink placeholder:text-faint"
          />
        </div>
        <div className="w-full sm:w-44">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "all", label: "All" },
              { value: "successful", label: "Successful" },
              { value: "failed", label: "Failed" },
              { value: "pending", label: "Pending" },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No transactions found" />
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: "none" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Reference</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Risk</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t._id || t.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{t.reference}</TableCell>
                  <TableCell>{t.customerName}</TableCell>
                  <TableCell>{formatDateTime(t.date || t.createdAt)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(t.amount)}</TableCell>
                  <TableCell>{(t.channel || "—").toUpperCase()}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell><RiskBadge level={t.riskLevel} score={t.riskScore} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}