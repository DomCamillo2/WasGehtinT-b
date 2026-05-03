"use client";

import { useMemo, useState } from "react";
import {
  clearCookieConsent,
  getCookieConsent,
  setCookieConsent,
} from "@/lib/cookie-consent";

export function PrivacyConsentControls() {
  const initialConsent = useMemo(() => getCookieConsent(), []);
  const [consent, setConsent] = useState(initialConsent);

  const helperText =
    consent === "accepted"
      ? "Aktuell ist die Einwilligung fuer optionale externe Dienste und Analytics erteilt."
      : consent === "rejected"
        ? "Aktuell ist die Einwilligung fuer optionale externe Dienste und Analytics abgelehnt."
        : "Aktuell wurde noch keine Auswahl gespeichert.";

  return (
    <div className="mt-3 space-y-2 rounded-2xl border p-3" style={{ borderColor: "var(--border-soft)" }}>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        {helperText}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl border px-3 py-2 text-xs font-medium"
          style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          onClick={() => {
            setCookieConsent("accepted");
            setConsent("accepted");
          }}
        >
          Einwilligung erteilen
        </button>
        <button
          type="button"
          className="rounded-xl border px-3 py-2 text-xs font-medium"
          style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          onClick={() => {
            setCookieConsent("rejected");
            setConsent("rejected");
          }}
        >
          Einwilligung widerrufen
        </button>
        <button
          type="button"
          className="rounded-xl border px-3 py-2 text-xs font-medium"
          style={{ borderColor: "var(--border-soft)", color: "var(--muted-foreground)" }}
          onClick={() => {
            clearCookieConsent();
            setConsent(null);
          }}
        >
          Auswahl zuruecksetzen
        </button>
      </div>
    </div>
  );
}
