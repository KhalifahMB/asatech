import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState, Skeleton, ErrorState } from "@/components/ui/Feedback";
import { useWishlist } from "@/state/wishlistStore";
import { getProduct } from "@/services/catalogService";

export default function Wishlist() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    setProducts(null);
    Promise.all(ids.map((id) => getProduct(id).catch(() => null)))
      .then((results) => {
        if (active) setProducts(results.filter(Boolean));
      })
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Wishlist</h1>
        <p className="mt-1 text-sm text-muted">Products you’ve saved for later.</p>
      </div>

      {error ? (
        <ErrorState description={error} />
      ) : products === null ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here."
          action={
            <Link to="/products" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
