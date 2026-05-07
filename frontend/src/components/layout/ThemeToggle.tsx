import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] backdrop-blur-xl 
  hover:bg-[var(--hover-glass-bg)] transition-all duration-300 shadow-[var(--shadow-glass)]"
    >
      <div className="relative w-5 h-5">
        {theme === "dark" ? (
          <Sun
            size={20}
            className="absolute inset-0 animate-in fade-in duration-300 rotate-0"
          />
        ) : (
          <Moon
            size={20}
            className="absolute inset-0 animate-in fade-in duration-300 rotate-0"
          />
        )}
      </div>
    </button>
  );
}
