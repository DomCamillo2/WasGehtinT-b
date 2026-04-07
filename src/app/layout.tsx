import type { Metadata } from "next";
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
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-04B6C4Y3NT"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-04B6C4Y3NT');
            `,
          }}
        />
        <ThemeInitScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <CookieConsentBannerMount />
      </body>
    </html>
  );
}
