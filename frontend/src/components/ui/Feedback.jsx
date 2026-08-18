import { Loader2, PackageSearch, AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/utils/cn";
import { Card } from "./Surfaces";

export function Spinner({ className }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand-500", className)} aria-hidden />;
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Skeleton({ className }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-raised", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-line/50 to-transparent" />
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-raised text-faint">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{title || "Nothing here yet"}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action, className }) {
  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center gap-3 border-red-500/20 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </Card>
  );
}

export function NotFoundIllustration({ className }) {
  return (
    <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-raised text-faint", className)}>
      <PackageSearch className="h-7 w-7" aria-hidden />
    </div>
  );
}
