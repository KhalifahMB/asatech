import { Minus, Plus } from "lucide-react";
import { cn } from "@/utils/cn";

export function QuantityControl({ value, onChange, min = 1, max = 99, className }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-line bg-panel",
        className
      )}
    >
      <button
        onClick={dec}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="flex h-9 w-9 items-center justify-center text-muted transition hover:text-ink disabled:opacity-35"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-9 text-center text-sm font-semibold text-ink tabular-nums">{value}</span>
      <button
        onClick={inc}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="flex h-9 w-9 items-center justify-center text-muted transition hover:text-ink disabled:opacity-35"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
