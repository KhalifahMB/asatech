import { useState } from "react";
import { Search } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper } from "@mui/material";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, RiskBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { SelectField } from "@/components/ui/Field";
import { useAsync } from "@/hooks/useAsync";
import { listTransactions } from "@/services/orderService";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function AdminTransactions() {
  const { data: txs, loading } = useAsync(() => listTransactions({}), []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = (txs || []).filter((t) => {
    if (status !== "all" && t.status !== status) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.reference.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Transactions" subtitle="All payment transactions across the platform." />

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
                <TableRow key={t.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{t.reference}</TableCell>
                  <TableCell>{t.customerName}</TableCell>
                  <TableCell>{formatDateTime(t.date)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(t.amount)}</TableCell>
                  <TableCell>{t.channel.toUpperCase()}</TableCell>
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
