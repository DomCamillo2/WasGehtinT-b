import type { Metadata } from "next";
import { GoogleAnalyticsConsent } from "@/components/analytics/google-analytics-consent";
import { CookieConsentBannerMount } from "@/components/layout/cookie-consent-banner-mount";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { validateSupabaseAdminConfig } from "@/lib/supabase/validate";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.wasgehttueb.app"),
  title: {
    default: "Party T\u00fcbingen heute: Clubs, Studentenpartys & Events | WasGehtT\u00fcb",
    template: "%s | WasGehtT\u00fcb",
  },
  description:
    "Dein Party-Radar f\u00fcr T\u00fcbingen: Clubhaus, Kuckuck, Schlachthaus, Studentenpartys und Events heute Abend auf einen Blick.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/icon.png", sizes: "180x180", type: "image/png" }],
  },
};

if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  const { valid, errors } = validateSupabaseAdminConfig();
  if (!valid) {
    console.error("[startup] Supabase Admin Config invalid:", errors.join(" "));
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning className="h-full antialiased">
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <GoogleAnalyticsConsent />
        {children}
        <CookieConsentBannerMount />
      </body>
    </html>
  );
}
