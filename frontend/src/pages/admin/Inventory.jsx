import { useState } from "react";
import { Search, Boxes } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogActions, IconButton } from "@mui/material";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { TextField } from "@/components/ui/Field";
import { useToast } from "@/state/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { listProducts } from "@/services/catalogService";
import { adjustStock } from "@/services/adminService";
import { CATEGORY_LABELS } from "@/lib/constants";

function stockStatus(stock) {
  if (stock <= 0) return "out-of-stock";
  if (stock <= 10) return "low-stock";
  return "in-stock";
}

export default function Inventory() {
  const toast = useToast();
  const { data: products, loading } = useAsync(() => listProducts({}), []);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [qty, setQty] = useState("");

  const filtered = (products || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (p) => {
    setEditing(p);
    setQty(String(p.stock));
  };

  const save = async () => {
    await adjustStock(editing.id, Number(qty));
    toast.success("Stock updated", `${editing.name} is now ${qty} units.`);
    setEditing(null);
    window.location.reload();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Inventory" subtitle="Monitor stock levels across the catalogue." />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search inventory…"
          className="h-10 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm text-ink placeholder:text-faint"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Boxes} title="No items found" />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                <img src={p.images[0]} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-line object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                  <p className="text-xs text-muted">{CATEGORY_LABELS[p.category]}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold text-ink">{p.stock}</p>
                  <p className="text-xs text-faint">units</p>
                </div>
                <StatusBadge status={stockStatus(p.stock)} />
                <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                  Adjust
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle className="flex items-center justify-between pr-2">
          <span className="text-base font-semibold">Adjust stock</span>
          <IconButton onClick={() => setEditing(null)} size="small" aria-label="Close">
            <X className="h-4 w-4" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <p className="mb-3 text-sm text-muted">{editing?.name}</p>
          <TextField label="Stock quantity" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
