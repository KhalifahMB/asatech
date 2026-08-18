import { cn } from "@/utils/cn";

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-panel", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Divider({ className }) {
  return <hr className={cn("border-t border-line", className)} />;
}
