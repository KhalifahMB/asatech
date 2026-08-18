import { cn } from "@/utils/cn";

/**
 * ASATECH brand mark — a hexagonal "chip" with an ascending chevron inside a
 * rounded square, paired with the wordmark. Works in both light and dark themes.
 */
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden="true">
      <defs>
        <linearGradient id="asatech-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#asatech-mark)" />
      <path
        d="M20 8l9 6v12l-9 6-9-6V14l9-6z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M13 17l7 5 7-5"
        fill="none"
        stroke="#93c5fd"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ showText = true, className, markClassName, textClassName, tagline = false }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      {showText && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-[1.15rem] font-extrabold tracking-tight text-ink",
              textClassName
            )}
          >
            ASATECH
          </span>
          {tagline && (
            <span className="mt-0.5 text-[0.62rem] font-medium uppercase tracking-[0.22em] text-muted">
              Premium Gadgets
            </span>
          )}
        </span>
      )}
    </span>
  );
}
