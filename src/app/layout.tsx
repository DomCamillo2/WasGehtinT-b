import type { Metadata } from "next";
import { CookieConsentBanner } from "@/components/layout/cookie-consent-banner";
import { Footer } from "@/components/layout/footer";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { validateSupabaseAdminConfig } from "@/lib/supabase/validate";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.wasgehttueb.app"),
  title: {
    default: "Party Tübingen heute: Clubs, Studentenpartys & Events | WasGehtTüb",
    template: "%s | WasGehtTüb",
  },
  description:
    "Dein Party-Radar für Tübingen: Clubhaus, Kuckuck, Schlachthaus, Studentenpartys und Events heute Abend auf einen Blick.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/Logo.png", type: "image/png" },
    ],
    shortcut: ["/Logo.png"],
    apple: [{ url: "/Logo.png" }],
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
