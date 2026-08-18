import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, ShoppingCart, Zap, Truck, ShieldCheck, RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/ProductCard";
import { Rating } from "@/components/Rating";
import { QuantityControl } from "@/components/QuantityControl";
import { EmptyState } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Surfaces";
import { StockBadge } from "@/components/ui/Badges";
import { useCart } from "@/state/CartContext";
import { useToast } from "@/state/ToastContext";
import { useWishlist } from "@/state/wishlistStore";
import { formatCurrency } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/constants";
import { getProduct, getRelated } from "@/services/catalogService";

export default function ProductDetails() {
  const { slug } = useParams();
  const { add } = useCart();
  const toast = useToast();
  const wishlist = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProduct(slug)
      .then(async (p) => {
        if (!active) return;
        setProduct(p);
        setActiveImg(0);
        setQty(1);
        if (p) {
          const rel = await getRelated(p.slug);
          if (active) setRelated(rel);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-3xl bg-raised" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-raised" />
            <div className="h-4 w-1/3 animate-pulse rounded-lg bg-raised" />
            <div className="h-6 w-1/4 animate-pulse rounded-lg bg-raised" />
            <div className="h-24 animate-pulse rounded-lg bg-raised" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          title="Product not found"
          description="This product may have been removed or the link is incorrect."
          action={
            <Button to="/products" variant="secondary">
              Back to shop
            </Button>
          }
        />
      </div>
    );
  }

  const pct = product.previousPrice
    ? Math.round((1 - product.price / product.previousPrice) * 100)
    : 0;
  const out = product.stock <= 0;
  const wished = wishlist.has(product.id);

  const handleAdd = () => {
    add(product, qty);
    toast.success(`${product.name} added to cart`);
  };

  const handleBuyNow = () => {
    add(product, qty);
    // navigate handled via Link below; but we add to cart then go to checkout
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex items-center gap-1 text-xs text-muted">
        <Link to="/" className="hover:text-brand-500">Home</Link>
        <ChevronRight className="h-3.5 w-3.5 text-faint" />
        <Link to="/products" className="hover:text-brand-500">Shop</Link>
        <ChevronRight className="h-3.5 w-3.5 text-faint" />
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="overflow-hidden rounded-3xl border border-line bg-panel">
            <img
              src={product.images[activeImg] || product.images[0]}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`h-20 w-20 overflow-hidden rounded-xl border-2 transition ${
                    activeImg === i ? "border-brand-500" : "border-line hover:border-faint"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              {CATEGORY_LABELS[product.category]}
            </span>
            <StockBadge stock={product.stock} />
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {product.name}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <Rating value={product.rating} count={product.ratingCount} />
          </div>

          <div className="mt-5 flex items-end gap-3">
            <p className="text-3xl font-extrabold tracking-tight text-ink">
              {formatCurrency(product.price)}
            </p>
            {product.previousPrice && (
              <>
                <p className="text-lg text-faint line-through">
                  {formatCurrency(product.previousPrice)}
                </p>
                <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-sm font-bold text-red-500">
                  Save {pct}%
                </span>
              </>
            )}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted">{product.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantityControl
              value={qty}
              onChange={setQty}
              max={Math.max(1, product.stock || 1)}
            />
            <Button onClick={handleAdd} disabled={out} icon={ShoppingCart} className="flex-1 sm:flex-none">
              Add to cart
            </Button>
            <Button
              onClick={() => wishlist.toggle(product.id)}
              variant="secondary"
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`h-4 w-4 ${wished ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
          </div>

          <Button
            to="/checkout"
            onClick={handleBuyNow}
            disabled={out}
            variant="primary"
            size="lg"
            icon={Zap}
            className="mt-3 w-full sm:w-auto"
          >
            Buy now
          </Button>

          {/* Delivery / warranty */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <Truck className="h-5 w-5 text-brand-500" />
              <p className="mt-2 text-sm font-semibold text-ink">Fast delivery</p>
              <p className="mt-1 text-xs text-muted">Tracked shipping on every order.</p>
            </Card>
            <Card className="p-4">
              <ShieldCheck className="h-5 w-5 text-brand-500" />
              <p className="mt-2 text-sm font-semibold text-ink">Warranty included</p>
              <p className="mt-1 text-xs text-muted">Standard manufacturer coverage.</p>
            </Card>
            <Card className="p-4">
              <RotateCcw className="h-5 w-5 text-brand-500" />
              <p className="mt-2 text-sm font-semibold text-ink">Easy returns</p>
              <p className="mt-1 text-xs text-muted">Hassle-free returns window.</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <section className="mt-12">
        <h2 className="text-lg font-bold text-ink">Specifications</h2>
        <Card className="mt-4 divide-y divide-line">
          {product.specs.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center">
              <dt className="w-full text-sm text-muted sm:w-56">{s.label}</dt>
              <dd className="text-sm font-medium text-ink">{s.value}</dd>
            </div>
          ))}
        </Card>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-ink">You may also like</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
