import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["apify-client"],
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
