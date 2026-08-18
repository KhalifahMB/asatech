/**
 * Formatting helpers shared across the app.
 * Currency defaults to Nigerian Naira (₦) to match the Paystack payment flow.
 */

export const CURRENCY = "₦";

export function formatCurrency(value, { decimals = 0 } = {}) {
  const n = Number(value);
  if (Number.isNaN(n)) return `${CURRENCY}0`;
  return (
    CURRENCY +
    n.toLocaleString("en-NG", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function formatNumber(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-US");
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(value) {
  if (!value) return "—";
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

/** Short reference for display, e.g. "AST-8F3K2A". */
export function shortRef(ref) {
  if (!ref) return "—";
  return ref.length > 8 ? `${ref.slice(0, 4)}…${ref.slice(-4)}` : ref;
}

export function initials(name) {
  if (!name) return "—";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}
