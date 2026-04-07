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
    <div className="fixed inset-x-0 bottom-2 z-50 px-3">
      <div
        className="mx-auto max-w-md rounded-[24px] border p-3 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.75)] backdrop-blur-xl"
        style={{
          borderColor: "var(--border-soft)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--surface-card) 94%, transparent), color-mix(in srgb, var(--surface-elevated) 92%, transparent))",
        }}
      >
        <p className="text-sm leading-6" style={{ color: "var(--muted-foreground)" }}>
          {"Wir verwenden technisch notwendige Cookies fuer Login/Sicherheit. Optionale externe Dienste und Analytics (z. B. Karten, Google Analytics) laden wir nur mit deiner Einwilligung."}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => saveConsent("rejected")}
            className="h-10 flex-1 rounded-xl border text-sm font-medium"
            style={{
              borderColor: "var(--border-strong)",
              backgroundColor: "color-mix(in srgb, var(--surface-soft) 74%, transparent)",
              color: "var(--foreground)",
            }}
          >
            Ablehnen
          </button>
          <button
            type="button"
            onClick={() => saveConsent("accepted")}
            className="h-10 flex-1 rounded-xl text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent-strong), var(--accent))",
            }}
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
