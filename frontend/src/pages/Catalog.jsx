import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pagination } from "@mui/material";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { SelectField } from "@/components/ui/Field";
import { listProducts } from "@/services/catalogService";
import { CATEGORIES } from "@/lib/constants";

const PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "deals", label: "Biggest discount" },
];

const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "300000", label: "Under ₦300,000" },
  { value: "1000000", label: "Under ₦1,000,000" },
  { value: "2000000", label: "Under ₦2,000,000" },
  { value: "5000000", label: "Under ₦5,000,000" },
];

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "all";
  const query = searchParams.get("search") || "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState(query);
  const [sort, setSort] = useState(
    searchParams.get("sort") === "deals" ? "deals" : "featured"
  );
  const [maxPrice, setMaxPrice] = useState("");
  const [inStock, setInStock] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const t0 = Date.now();
    listProducts({})
      .then((data) => {
        const wait = Math.max(0, 350 - (Date.now() - t0));
        setTimeout(() => {
          if (!active) return;
          setProducts(data);
          setLoading(false);
        }, wait);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load products.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const setCategory = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === "all") next.delete("category");
    else next.set("category", id);
    setSearchParams(next);
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = products;
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.short.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice));
    if (inStock) list = list.filter((p) => p.stock > 0);

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      case "deals":
        list = [...list].sort(
          (a, b) =>
            (b.previousPrice ? b.previousPrice - b.price : 0) -
            (a.previousPrice ? a.previousPrice - a.price : 0)
        );
        break;
      default:
        break;
    }
    return list;
  }, [products, category, search, maxPrice, inStock, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [category, search, maxPrice, inStock, sort]);

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Shop gadgets"
        subtitle="Browse the full ASATECH catalogue."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Shop" }]}
      />

      {/* Category pills */}
      <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: "all", label: "All" }, ...CATEGORIES].map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              category === c.id
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-line bg-panel text-muted hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-line bg-panel p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-8 text-sm text-ink placeholder:text-faint focus:border-brand-500"
            aria-label="Search products"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-full sm:w-48">
            <SelectField
              label="Sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              options={SORT_OPTIONS}
            />
          </div>
          <div className="w-full sm:w-44">
            <SelectField
              label="Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              options={PRICE_OPTIONS}
            />
          </div>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            In stock
          </label>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">
        {loading ? "Loading…" : `${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
      </p>

      {/* Results */}
      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl border border-line bg-raised" />
          ))}
        </div>
      ) : error ? (
        <ErrorState description={error} className="mt-4" />
      ) : pageItems.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={SlidersHorizontal}
          title="No products found"
          description="Try adjusting your filters or search terms."
        />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {pageItems.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                shape="rounded"
                color="primary"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
