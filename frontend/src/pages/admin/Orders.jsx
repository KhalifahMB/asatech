import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper } from "@mui/material";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, RiskBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { SelectField } from "@/components/ui/Field";
import { useAsync } from "@/hooks/useAsync";
import { listOrders } from "@/services/orderService";
import { ORDER_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";

export default function AdminOrders() {
  const { data: orders, loading } = useAsync(() => listOrders({}), []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = (orders || []).filter((o) => {
    if (status !== "all" && o.orderStatus !== status) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.ref.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Orders" subtitle="Review and manage customer orders." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order or customer…"
            className="h-10 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm text-ink placeholder:text-faint"
          />
        </div>
        <div className="w-full sm:w-44">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[{ value: "all", label: "All" }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]}
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
        <EmptyState title="No orders found" />
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: "none" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Risk</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id} hover component={Link} to={`/admin/orders/${o.ref}`} sx={{ textDecoration: "none", "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{o.ref}</TableCell>
                  <TableCell>{o.customerName}</TableCell>
                  <TableCell>{formatDate(o.date)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(o.total)}</TableCell>
                  <TableCell><StatusBadge status={o.paymentStatus} /></TableCell>
                  <TableCell><StatusBadge status={o.orderStatus} /></TableCell>
                  <TableCell><RiskBadge level={o.riskLevel} score={o.riskScore} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
