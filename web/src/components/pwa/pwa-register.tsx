"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const bumpWorker = () => {
      void navigator.serviceWorker.getRegistration().then((reg) => {
        void reg?.update();
      });
    };

    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        void reg.update();
      })
      .catch((error) => {
        console.error("[pwa] Service worker registration failed:", error);
      });

    window.addEventListener("focus", bumpWorker);
    return () => window.removeEventListener("focus", bumpWorker);
  }, []);

  return null;
}
