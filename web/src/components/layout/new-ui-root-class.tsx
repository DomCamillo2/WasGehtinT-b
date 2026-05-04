"use client";

import { useEffect } from "react";

const NEW_UI_CLASS = "discover-ui-new";

type Props = {
  enabled: boolean;
};

export function NewUiRootClass({ enabled }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add(NEW_UI_CLASS);
    } else {
      root.classList.remove(NEW_UI_CLASS);
    }

    return () => {
      root.classList.remove(NEW_UI_CLASS);
    };
  }, [enabled]);

  return null;
}
