import type { NextConfig } from "next";
import path from "path";

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
    formats: ["image/avif", "image/webp"],
    /** Smaller breakpoints first so typical phones (~390–430px) avoid oversized 640px buckets when possible. */
    deviceSizes: [384, 420, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24,
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
        ],
      },
    ];
  },
};

export default nextConfig;
