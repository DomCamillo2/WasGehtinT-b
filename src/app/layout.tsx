import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Footer } from "@/components/layout/footer";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { validateSupabaseAdminConfig } from "@/lib/supabase/validate";
import "./globals.css";

const CookieConsentBanner = dynamic(
  () => import("@/components/layout/cookie-consent-banner").then((module) => module.CookieConsentBanner),
  { ssr: false },
);

export const metadata: Metadata = {
  metadataBase: new URL("https://www.wasgehttueb.app"),
  title: {
    default: "Party Tübingen heute: Clubs, Studentenpartys & Events | WasGehtTüb",
    template: "%s | WasGehtTüb",
  },
  description:
    "Dein Party-Radar für Tübingen: Clubhaus, Kuckuck, Schlachthaus, Studentenpartys und Events heute Abend auf einen Blick.",
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
        {children}
        <Footer />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
