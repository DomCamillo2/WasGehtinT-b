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
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
        <p className="text-sm text-zinc-700">
          Wir verwenden technisch notwendige Cookies für Login/Sicherheit. Externe Dienste (z. B. Karten) werden nur mit deiner Einwilligung geladen.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => saveConsent("rejected")}
            className="h-10 flex-1 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-700"
          >
            Ablehnen
          </button>
          <button
            type="button"
            onClick={() => saveConsent("accepted")}
            className="h-10 flex-1 rounded-xl bg-zinc-900 text-sm font-semibold text-white"
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
