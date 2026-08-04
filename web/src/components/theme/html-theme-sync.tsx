"use client";

import { useEffect } from "react";

const STORAGE_KEY = "wgt-theme";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredMode(): ThemeMode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "system";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}

/**
 * Keeps `light`/`dark` on <html> even when React resets `className` on the root
 * element (fonts/layout). Without this, `html.discover-ui-new` alone used to
 * lock chrome to night tokens after hydration/navigation.
 */
export function HtmlThemeSync() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const resolved = resolveTheme(readStoredMode());
      const hasLight = root.classList.contains("light");
      const hasDark = root.classList.contains("dark");
      if (resolved === "light" && (!hasLight || hasDark)) {
        root.classList.remove("dark");
        root.classList.add("light");
        root.style.colorScheme = "light";
      } else if (resolved === "dark" && (!hasDark || hasLight)) {
        root.classList.remove("light");
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      }
    };

    apply();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          apply();
          break;
        }
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if (readStoredMode() === "system") apply();
    };
    media.addEventListener("change", onSystem);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) apply();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", onSystem);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
