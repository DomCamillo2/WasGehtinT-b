"use client";

import { useEffect } from "react";

const NEW_UI_CLASS = "discover-ui-new";

type Props = {
  enabled: boolean;
};

/**
 * Pins discover-ui-new on <html>. Re-applies if React layout className resets wipe it.
 */
export function NewUiRootClass({ enabled }: Props) {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      if (enabled) {
        if (!root.classList.contains(NEW_UI_CLASS)) {
          root.classList.add(NEW_UI_CLASS);
        }
      } else {
        root.classList.remove(NEW_UI_CLASS);
      }
    };

    sync();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          sync();
          break;
        }
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      root.classList.remove(NEW_UI_CLASS);
    };
  }, [enabled]);

  return null;
}
