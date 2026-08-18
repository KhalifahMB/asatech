import { Link } from "react-router-dom";
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Surfaces";
import { EmptyState } from "@/components/ui/Feedback";
import { QuantityControl } from "@/components/QuantityControl";
import { useCart } from "@/state/CartContext";
import { formatCurrency } from "@/lib/format";

const SHIPPING_FLAT = 2500;
const FREE_SHIPPING_THRESHOLD = 500000;

export default function Cart() {
  const { items, updateQuantity, remove, subtotal, clear } = useCart();
  const shipping = subtotal === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse the catalogue and add the gadgets you love."
          action={
            <Button to="/products" icon={ShoppingBag}>
              Start shopping
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Shopping cart</h1>
        <button onClick={clear} className="text-sm font-medium text-muted hover:text-red-500">
          Clear cart
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.productId} className="flex gap-4 p-3 sm:p-4">
              <Link
                to={`/products/${item.slug}`}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-raised sm:h-24 sm:w-24"
              >
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/products/${item.slug}`}
                    className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand-500"
                  >
                    {item.name}
                  </Link>
                  <button
                    onClick={() => remove(item.productId)}
                    aria-label={`Remove ${item.name}`}
                    className="text-faint transition hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted">{formatCurrency(item.price)} each</p>
                <div className="mt-auto flex items-end justify-between pt-2">
                  <QuantityControl
                    value={item.quantity}
                    onChange={(q) => updateQuantity(item.productId, q)}
                  />
                  <p className="text-sm font-bold text-ink">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-20 p-5">
            <h2 className="text-base font-semibold text-ink">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-medium text-ink">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="font-medium text-ink">
                  {shipping === 0 ? "Free" : formatCurrency(shipping)}
                </dd>
              </div>
              {subtotal < FREE_SHIPPING_THRESHOLD && subtotal > 0 && (
                <p className="rounded-md bg-brand-500/10 px-2.5 py-1.5 text-xs text-brand-500">
                  Add {formatCurrency(FREE_SHIPPING_THRESHOLD - subtotal)} more for free delivery.
                </p>
              )}
              <div className="border-t border-line pt-3">
                <div className="flex justify-between text-base font-bold text-ink">
                  <dt>Total</dt>
                  <dd>{formatCurrency(total)}</dd>
                </div>
              </div>
            </dl>
            <Button to="/checkout" size="lg" className="mt-5 w-full" iconRight={ArrowRight}>
              Proceed to checkout
            </Button>
            <Link
              to="/products"
              className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Continue shopping
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
