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
  "img-src 'self' data: blob: https://images.pexels.com https://images.unsplash.com https://*.supabase.co",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Next.js + Supabase auth require inline/eval in practice for App Router hydration.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'${supabaseHost ? ` https://${supabaseHost}` : ""}`,
  `connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""} https://images.pexels.com`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["apify-client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
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
