import { Star, StarHalf } from "lucide-react";
import { cn } from "@/utils/cn";

export function Rating({ value = 0, count, className, size = "h-3.5 w-3.5" }) {
  const rounded = Math.round(value * 2) / 2;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rounded >= i) {
      stars.push(<Star key={i} className={cn(size, "fill-amber-400 text-amber-400")} />);
    } else if (rounded >= i - 0.5) {
      stars.push(<StarHalf key={i} className={cn(size, "fill-amber-400 text-amber-400")} />);
    } else {
      stars.push(<Star key={i} className={cn(size, "text-faint")} />);
    }
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
        {stars}
      </span>
      {count != null && <span className="text-xs text-faint">({count})</span>}
    </span>
  );
}
