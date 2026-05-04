"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

const UI_NEW_CLASS = "discover-ui-new";

/**
 * Toggles global theme class while `/discover?ui=new` is active (cleanup on leave).
 */
export function DiscoverUiNewRootClass() {
  const searchParams = useSearchParams();
  const ui = searchParams.get("ui");

  useEffect(() => {
    const root = document.documentElement;
    if (ui === "new") {
      root.classList.add(UI_NEW_CLASS);
    } else {
      root.classList.remove(UI_NEW_CLASS);
    }
    return () => {
      root.classList.remove(UI_NEW_CLASS);
    };
  }, [ui]);

  return null;
}
