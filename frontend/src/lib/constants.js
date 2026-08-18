/**
 * Shared domain constants. These describe the ASATECH business model and are
 * used consistently across the storefront and the admin console.
 */

export const CATEGORIES = [
  { id: "smartphones", label: "Smartphones" },
  { id: "laptops", label: "Laptops" },
  { id: "tablets", label: "Tablets" },
  { id: "smartwatches", label: "Smartwatches" },
  { id: "headphones", label: "Headphones" },
  { id: "chargers", label: "Chargers" },
  { id: "other", label: "Other Devices" },
];

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label])
);

/**
 * Risk scoring bands defined by the project proposal.
 * Scores are provided by the backend; the frontend only displays them.
 */
export const RISK_LEVELS = {
  low: { label: "Low", min: 0, max: 29 },
  medium: { label: "Medium", min: 30, max: 59 },
  high: { label: "High", min: 60, max: 100 },
};

export function riskLevelForScore(score) {
  const s = Number(score);
  if (Number.isNaN(s)) return "low";
  if (s >= RISK_LEVELS.high.min) return "high";
  if (s >= RISK_LEVELS.medium.min) return "medium";
  return "low";
}

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "cancelled",
];

export const FRAUD_ALERT_STATUSES = [
  "new",
  "under-review",
  "approved",
  "rejected",
  "resolved",
];

export const TRANSACTION_STATUSES = [
  "pending",
  "processing",
  "successful",
  "failed",
  "cancelled",
];

/**
 * Conceptual risk indicators surfaced during fraud investigation.
 * These are UI categories, not a scoring algorithm.
 */
export const RISK_FACTORS = [
  "High-value purchase",
  "Multiple purchases in a short period",
  "New or unrecognized device",
  "Multiple failed login attempts",
  "Unusual purchasing behaviour",
  "Other suspicious activity",
];

/** Order tracking steps shown to customers (frontend representation only). */
export const TRACKING_STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "paid", label: "Payment confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export const APP_NAME = "ASATECH";
