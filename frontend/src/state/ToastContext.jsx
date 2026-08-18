import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, ring: "text-emerald-400", bar: "bg-emerald-500" },
  error: { icon: XCircle, ring: "text-red-400", bar: "bg-red-500" },
  warning: { icon: AlertTriangle, ring: "text-amber-400", bar: "bg-amber-500" },
  info: { icon: Info, ring: "text-sky-400", bar: "bg-sky-500" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message, title) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, type, message, title }]);
      setTimeout(() => dismiss(id), 4600);
    },
    [dismiss]
  );

  const toast = useCallback(
    (options) => {
      if (typeof options === "string") return push("info", options);
      return push(options.type || "info", options.message, options.title);
    },
    [push]
  );

  toast.success = (msg, title) => push("success", msg, title);
  toast.error = (msg, title) => push("error", msg, title);
  toast.warning = (msg, title) => push("warning", msg, title);
  toast.info = (msg, title) => push("info", msg, title);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[1300] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.info;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role="status"
              className="animate-slide-up pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-line bg-panel p-3.5 shadow-lg shadow-black/20"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} />
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.ring}`} aria-hidden />
              <div className="min-w-0 flex-1">
                {t.title && <p className="text-sm font-semibold text-ink">{t.title}</p>}
                <p className="text-sm text-muted">{t.message}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-faint transition hover:bg-raised hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
