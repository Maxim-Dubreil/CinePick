import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("cinepick-theme") as Theme | null;
    if (saved) return saved;

    // Scan system preference if no saved theme
    const prefersLight = window.matchMedia(
      "(prefers-color-scheme: light)",
    ).matches;
    return prefersLight ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cinepick-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, setTheme, toggle };
}
