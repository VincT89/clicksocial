import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useDarkMode";
import IconHint from "@/components/IconHint";

// Toggle tema chiaro/scuro. Persiste la scelta in localStorage e aggiormentra la classe "dark".
export default function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <IconHint label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}><button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      className={`nav-icon ${className}`}
    >
      {isDark ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
    </button></IconHint>
  );
}
