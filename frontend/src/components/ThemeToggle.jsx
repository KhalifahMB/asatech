import { Sun, Moon } from "lucide-react";
import { useThemeMode } from "@/state/ThemeContext";

export function ThemeToggle({ className }) {
  const { isDark, toggle } = useThemeMode();
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-raised hover:text-ink ${className || ""}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
