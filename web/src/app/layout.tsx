import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { GoogleAnalyticsConsent } from "@/components/analytics/google-analytics-consent";
import { CookieConsentBannerMount } from "@/components/layout/cookie-consent-banner-mount";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { SiteSchema } from "@/components/seo/site-schema";
import { ToastProvider } from "@/components/ui/toast-provider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-config";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { validateSupabaseAdminConfig } from "@/lib/supabase/validate";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
  preload: true,
});

/** Wortmarke / Logo — SemiBold, urban, gut lesbar in kleinen Größen */
const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "600",
  variable: "--font-bricolage",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Party Tuebingen heute: Clubs, Studentenpartys & Events | WasGehtTueb",
    template: `%s | ${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  description: SITE_DESCRIPTION,
  keywords: [
    "Tuebingen Events",
    "Tuebingen Partys",
    "Studentenpartys Tuebingen",
    "Clubs in Tuebingen",
    "Was geht heute in Tuebingen",
  ],
  icons: {
    icon: [{ url: "/favicon-tight.png", type: "image/png" }],
    shortcut: [{ url: "/favicon-tight.png" }],
    apple: [{ url: "/icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "Party Tuebingen heute: Clubs, Studentenpartys & Events",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Party Tuebingen heute: Clubs, Studentenpartys & Events",
    description: SITE_DESCRIPTION,
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
    <html
      lang="de"
      suppressHydrationWarning
      className={`h-full antialiased ${figtree.variable} ${bricolageGrotesque.variable}`}
    >
      <head>
        <ThemeInitScript />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ToastProvider>
          <SiteSchema />
          <PwaRegister />
          <GoogleAnalyticsConsent />
          {children}
          <CookieConsentBannerMount />
        </ToastProvider>
      </body>
    </html>
  );
}
