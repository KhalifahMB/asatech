import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55";

const variants = {
  primary: "bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700",
  secondary: "border border-line bg-raised text-ink hover:bg-line/60",
  outline: "border border-line bg-transparent text-ink hover:bg-raised",
  ghost: "text-muted hover:bg-raised hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-700",
  dangerGhost: "text-red-500 hover:bg-red-500/10",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[0.95rem]",
  icon: "h-10 w-10",
};

export function Button({
  to,
  href,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  iconRight: RightIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}) {
  const cls = cn(base, variants[variant], sizes[size], className);
  const content = (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className="h-4 w-4" aria-hidden />
      ) : null}
      {children}
      {RightIcon && !loading ? <RightIcon className="h-4 w-4" aria-hidden /> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
