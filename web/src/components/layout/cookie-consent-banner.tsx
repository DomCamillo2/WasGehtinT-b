"use client";

import { useState } from "react";
import { getCookieConsent, setCookieConsent } from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !getCookieConsent();
  });

  function saveConsent(value: "accepted" | "rejected") {
    setCookieConsent(value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-50 px-3 sm:bottom-[5.5rem]">
      <div
        className="pointer-events-auto mx-auto max-w-md rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] p-3 shadow-[0_12px_32px_-20px_rgba(0,0,0,0.55)]"
      >
        <p className="text-sm leading-6 text-[color:var(--foreground)]">
          Technisch nötige Cookies für die App. Optionale Dienste (Karten, Analytics) nur mit
          Einwilligung.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => saveConsent("rejected")}
            className="min-h-[44px] flex-1 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] text-sm font-medium text-[color:var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
          >
            Ablehnen
          </button>
          <button
            type="button"
            onClick={() => saveConsent("accepted")}
            className="min-h-[44px] flex-1 rounded-xl bg-[color:var(--accent)] text-sm font-semibold text-[color:var(--accent-dark-text)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
