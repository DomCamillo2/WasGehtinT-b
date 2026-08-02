import type { NextConfig } from "next";
import path from "path";

const supabaseHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  try {
    return raw ? new URL(raw.replace(/\\n$/g, "").replace(/^"|"$/g, "")).host : null;
  } catch {
    return null;
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://images.pexels.com https://images.unsplash.com https://*.supabase.co https://*.cartocdn.com https://tile.openstreetmap.org",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Next.js + Supabase auth require inline/eval in practice for App Router hydration.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com${supabaseHost ? ` https://${supabaseHost}` : ""}`,
  [
    "connect-src 'self'",
    "https://api.stripe.com",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    supabaseHost ? `https://${supabaseHost}` : "",
    supabaseHost ? `wss://${supabaseHost}` : "",
    "https://images.pexels.com",
    "https://images.unsplash.com",
    "https://*.cartocdn.com",
    "https://tile.openstreetmap.org",
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
    "https://www.googletagmanager.com",
  ]
    .filter(Boolean)
    .join(" "),
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["apify-client"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
            },
          ]
        : []),
    ],
  },
  outputFileTracingIncludes: {
    "/api/cron/scrape": [
      "./node_modules/proxy-agent/**",
      "./node_modules/agent-base/**",
      "./node_modules/http-proxy-agent/**",
      "./node_modules/https-proxy-agent/**",
      "./node_modules/pac-proxy-agent/**",
      "./node_modules/socks-proxy-agent/**",
      "./node_modules/proxy-from-env/**",
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
