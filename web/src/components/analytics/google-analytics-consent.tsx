"use client";

import { useEffect, useRef } from "react";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  getCookieConsent,
} from "@/lib/cookie-consent";

const GA_MEASUREMENT_ID = "G-04B6C4Y3NT";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: string]: unknown;
  }
}

function deleteGaCookie(name: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.wasgehttueb.app; SameSite=Lax`;
}

function revokeGoogleAnalytics() {
  if (typeof window === "undefined") {
    return;
  }

  window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }

  deleteGaCookie("_ga");
  deleteGaCookie(`_ga_${GA_MEASUREMENT_ID.replace(/-/g, "_")}`);
}

function loadGoogleAnalytics() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)) {
    return;
  }

  window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  }

  window.gtag = gtag;
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    anonymize_ip: true,
  });
}

export function GoogleAnalyticsConsent() {
  const initializedRef = useRef(false);

  useEffect(() => {
    const applyConsent = () => {
      const consent = getCookieConsent();
      if (consent === "accepted") {
        loadGoogleAnalytics();
        initializedRef.current = true;
      } else if (initializedRef.current) {
        revokeGoogleAnalytics();
      }
    };

    applyConsent();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, applyConsent);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, applyConsent);
    };
  }, []);

  return null;
}
