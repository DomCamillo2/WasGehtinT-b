"use client";

import dynamic from "next/dynamic";

const CookieConsentBanner = dynamic(
  () => import("@/components/layout/cookie-consent-banner").then((module) => module.CookieConsentBanner),
  { ssr: false },
);

export function CookieConsentBannerMount() {
  return <CookieConsentBanner />;
}
