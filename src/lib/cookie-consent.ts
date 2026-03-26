export const COOKIE_CONSENT_KEY = "wasgehttueb_cookie_consent_v1";

export function getCookieConsent(): "accepted" | "rejected" | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  if (value === "accepted" || value === "rejected") return value;
  return null;
}

export function setCookieConsent(value: "accepted" | "rejected") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
}

export function hasExternalServicesConsent() {
  return getCookieConsent() === "accepted";
}
