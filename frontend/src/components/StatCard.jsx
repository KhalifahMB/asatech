import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { Card } from "./ui/Surfaces";
import { Skeleton } from "./ui/Feedback";

export function StatCard({ label, value, icon: Icon, delta, deltaDirection, tone = "brand", loading, hint }) {
  const iconTone = {
    brand: "bg-brand-500/10 text-brand-500",
    success: "bg-emerald-500/10 text-emerald-500",
    warning: "bg-amber-500/10 text-amber-500",
    danger: "bg-red-500/10 text-red-500",
    info: "bg-sky-500/10 text-sky-500",
  }[tone];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <p className="mt-1.5 truncate text-2xl font-bold tracking-tight text-ink">{value}</p>
          )}
          {hint && !loading && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconTone)}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
      </div>
      {delta != null && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {deltaDirection !== "down" ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
          )}
          <span className={deltaDirection === "down" ? "text-red-500" : "text-emerald-500"}>
            {delta}
          </span>
          <span className="text-faint">vs last period</span>
        </div>
      )}
    </Card>
  );
}
