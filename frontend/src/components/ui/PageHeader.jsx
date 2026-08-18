import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export function PageHeader({ title, subtitle, breadcrumbs = [], actions, className }) {
  return (
    <div className={className}>
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-muted">
          {breadcrumbs.map((b, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-faint" />}
                {b.to && !isLast ? (
                  <Link to={b.to} className="hover:text-brand-500">
                    {b.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-ink" : ""}>{b.label}</span>
                )}
              </span>
            );
          })}
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
