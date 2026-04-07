export const COOKIE_CONSENT_KEY = "wasgehttueb_cookie_consent_v1";
export const COOKIE_CONSENT_CHANGED_EVENT = "wasgehttueb:cookie-consent-changed";

export type CookieConsentValue = "accepted" | "rejected";

export function getCookieConsent(): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  if (value === "accepted" || value === "rejected") return value;
  return null;
}

function dispatchCookieConsentChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT));
}

export function setCookieConsent(value: CookieConsentValue) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  dispatchCookieConsentChanged();
}

export function clearCookieConsent() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COOKIE_CONSENT_KEY);
  dispatchCookieConsentChanged();
}

export function hasExternalServicesConsent() {
  return getCookieConsent() === "accepted";
}
