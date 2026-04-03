"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "wgt-theme";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeToggleProps = {
  className?: string;
};

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}

function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;

  return resolved;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : "system";
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    return getSystemTheme();
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", onSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
  }, []);

  const resolvedTheme: ResolvedTheme = mode === "system" ? systemTheme : mode;

  useEffect(() => {
    applyTheme(mode === "system" ? systemTheme : mode);
  }, [mode, systemTheme]);

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    const nextMode: ThemeMode = isDark ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, nextMode);
    setMode(nextMode);
    applyTheme(nextMode);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`grid h-10 w-10 place-items-center rounded-2xl border bg-[color:var(--surface-elevated)] text-[color:var(--foreground)] shadow-sm transition hover:opacity-95 active:scale-[0.98] ${className ?? ""}`.trim()}
      style={{ borderColor: "var(--nav-border)" }}
      aria-label={mounted ? (isDark ? "Helles Farbschema aktivieren" : "Dunkles Farbschema aktivieren") : "Farbschema wechseln"}
      title={mounted ? (isDark ? "Auf hell umschalten" : "Auf dunkel umschalten") : "Farbschema wechseln"}
    >
      {mounted ? (isDark ? <Sun size={17} /> : <Moon size={17} />) : <Moon size={17} />}
    </button>
  );
}
