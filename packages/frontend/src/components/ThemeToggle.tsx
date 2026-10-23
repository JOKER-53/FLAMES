import { useEffect, useState } from "react";
import { Icon } from "./ui/Icon";

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("fortisim-theme"); } catch { /* Use system. */ }
      const next = saved === "dark" || saved === "light" ? saved : media.matches ? "dark" : "light";
      document.documentElement.dataset.theme = next; setTheme(next);
    };
    media.addEventListener("change", sync); window.addEventListener("storage", sync);
    sync();
    return () => { media.removeEventListener("change", sync); window.removeEventListener("storage", sync); };
  }, []);
  return <button type="button" className="btn-secondary btn-sm px-2" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; setTheme(next);
    try { localStorage.setItem("fortisim-theme", next); } catch { /* Current tab still works. */ }
  }}><Icon name={theme === "dark" ? "sun" : "moon"} size={16} /><span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span></button>;
}
