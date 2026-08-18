import { Check, Circle } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/lib/format";

/**
 * Order tracking timeline. `steps` = [{ label, at, done }]. The first
 * not-done step is treated as the "current" position.
 */
export function Timeline({ steps }) {
  const currentIndex = steps.findIndex((s) => !s.done);
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isCurrent = i === currentIndex;
        return (
          <li key={step.label} className="relative flex gap-4 pb-7 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px",
                  step.done ? "bg-brand-500" : "bg-line"
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                step.done
                  ? "border-brand-500 bg-brand-500 text-white"
                  : isCurrent
                  ? "border-brand-500 bg-brand-500/10 text-brand-500"
                  : "border-line bg-panel text-faint"
              )}
            >
              {step.done ? (
                <Check className="h-4 w-4" />
              ) : isCurrent ? (
                <Circle className="h-3 w-3 fill-current" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </span>
            <div className="pt-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  step.done || isCurrent ? "text-ink" : "text-faint"
                )}
              >
                {step.label}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-brand-500">
                    Current
                  </span>
                )}
              </p>
              {step.at && <p className="mt-0.5 text-xs text-muted">{formatDateTime(step.at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
