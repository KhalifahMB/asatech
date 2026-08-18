import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/constants";
import { useCart } from "@/state/CartContext";
import { useWishlist } from "@/state/wishlistStore";
import { useToast } from "@/state/ToastContext";
import { Rating } from "./Rating";
import { StockBadge } from "./ui/Badges";

function discountPct(product) {
  if (!product.previousPrice) return 0;
  return Math.round((1 - product.price / product.previousPrice) * 100);
}

export function ProductCard({ product, className }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const toast = useToast();
  const [added, setAdded] = useState(false);
  const wished = wishlist.has(product.id);
  const out = product.stock <= 0;
  const pct = discountPct(product);

  const handleAdd = () => {
    add(product, 1);
    setAdded(true);
    toast.success(`${product.name} added to cart`);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-panel transition-shadow hover:shadow-lg hover:shadow-black/5",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-raised">
        <Link to={`/products/${product.slug}`} aria-label={product.name}>
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        {pct > 0 && (
          <span className="absolute left-3 top-3 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            -{pct}%
          </span>
        )}
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-md bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
            {product.badge}
          </span>
        )}
        <button
          onClick={() => wishlist.toggle(product.id)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className={cn(
            "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border bg-panel/90 shadow-sm backdrop-blur transition",
            wished ? "border-red-300 text-red-500" : "border-line text-muted hover:text-red-500"
          )}
        >
          <Heart className={cn("h-4 w-4", wished && "fill-red-500")} />
        </button>
        {out && (
          <div className="absolute inset-0 flex items-center justify-center bg-panel/60 backdrop-blur-[1px]">
            <span className="rounded-md bg-panel px-3 py-1 text-sm font-semibold text-muted">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-faint">
            {CATEGORY_LABELS[product.category] || product.category}
          </span>
          <StockBadge stock={product.stock} />
        </div>
        <Link
          to={`/products/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold text-ink transition-colors hover:text-brand-500"
        >
          {product.name}
        </Link>
        <Rating value={product.rating} count={product.ratingCount} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-base font-bold text-ink">{formatCurrency(product.price)}</p>
            {product.previousPrice && (
              <p className="text-xs text-faint line-through">{formatCurrency(product.previousPrice)}</p>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={out}
            aria-label={`Add ${product.name} to cart`}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40",
              added ? "bg-emerald-500 text-white" : "bg-brand-600 text-white hover:bg-brand-700"
            )}
          >
            {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
