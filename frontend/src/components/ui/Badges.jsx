import { cn } from "@/utils/cn";
import { riskLevelForScore } from "@/lib/constants";

export const TONES = {
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  brand: "border-brand-500/25 bg-brand-500/10 text-brand-600 dark:text-brand-300",
  neutral: "border-line bg-raised text-muted",
};

export const DOT = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
  brand: "bg-brand-500",
  neutral: "bg-faint",
};

export function Pill({ tone = "neutral", dot = false, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} aria-hidden />}
      {children}
    </span>
  );
}

const STATUS_META = {
  pending: { label: "Pending", tone: "warning" },
  processing: { label: "Processing", tone: "info" },
  confirmed: { label: "Confirmed", tone: "info" },
  shipped: { label: "Shipped", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  paid: { label: "Paid", tone: "success" },
  successful: { label: "Successful", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
  new: { label: "New", tone: "info" },
  "under-review": { label: "Under Review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  resolved: { label: "Resolved", tone: "neutral" },
  active: { label: "Active", tone: "success" },
  flagged: { label: "Flagged", tone: "danger" },
  "in-stock": { label: "In stock", tone: "success" },
  "low-stock": { label: "Low stock", tone: "warning" },
  "out-of-stock": { label: "Out of stock", tone: "danger" },
};

const RISK_META = {
  low: { label: "Low risk", tone: "success" },
  medium: { label: "Medium risk", tone: "warning" },
  high: { label: "High risk", tone: "danger" },
};

export function StatusBadge({ status, label, className, dot = true }) {
  const meta = STATUS_META[status] || { label: label || status, tone: "neutral" };
  return (
    <Pill tone={meta.tone} dot={dot} className={className}>
      {label || meta.label}
    </Pill>
  );
}

/** Risk badge driven by level (low/medium/high) and optional numeric score. */
export function RiskBadge({ level, score, className, dot = true }) {
  const resolved = RISK_META[level] ? level : riskLevelForScore(score);
  const meta = RISK_META[resolved] || RISK_META.low;
  return (
    <Pill tone={meta.tone} dot={dot} className={className}>
      {meta.label}
      {typeof score === "number" && !Number.isNaN(score) && <span className="opacity-80">· {score}</span>}
    </Pill>
  );
}

export function StockBadge({ stock, className }) {
  let status = "in-stock";
  if (stock <= 0) status = "out-of-stock";
  else if (stock <= 10) status = "low-stock";
  return <StatusBadge status={status} className={className} />;
}
