import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Badges";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/Field";
import { useToast } from "@/state/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { listProducts } from "@/services/catalogService";
import { deleteProduct } from "@/services/adminService";
import { CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

function stockStatus(stock) {
  if (stock <= 0) return "out-of-stock";
  if (stock <= 10) return "low-stock";
  return "in-stock";
}

export default function Products() {
  const toast = useToast();
  const { data: products, loading } = useAsync(() => listProducts({}), []);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = (products || []).filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (search.trim()) return p.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const confirmDelete = async () => {
    setDeleting(true);
    await deleteProduct(toDelete.id);
    setDeleting(false);
    setToDelete(null);
    toast.success("Product deleted");
    // Refresh list (demo store mutation is reflected on next load).
    window.location.reload();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Products"
        subtitle="Manage your product catalogue."
        actions={
          <Button to="/admin/products/new" icon={Plus}>
            Add product
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="h-10 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm text-ink placeholder:text-faint"
          />
        </div>
        <div className="w-full sm:w-48">
          <SelectField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[{ value: "all", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No products found" description="Try a different search or category." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                <img src={p.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                  <p className="text-xs capitalize text-muted">{p.category}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-ink">{formatCurrency(p.price)}</p>
                  <p className="text-xs text-muted">{p.stock} in stock</p>
                </div>
                <StatusBadge status={stockStatus(p.stock)} dot />
                <div className="flex items-center gap-1">
                  <Link
                    to={`/admin/products/${p.id}/edit`}
                    aria-label={`Edit ${p.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setToDelete(p)}
                    aria-label={`Delete ${p.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        danger
        loading={deleting}
        title="Delete product?"
        description={`“${toDelete?.name}” will be permanently removed from the catalogue.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
