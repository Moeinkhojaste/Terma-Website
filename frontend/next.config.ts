import type { NextConfig } from "next";

const configuredApi = process.env.NEXT_PUBLIC_API_BASE_URL ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL) : undefined;
const configuredSite = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined;

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https: ${configuredApi ? configuredApi.origin : ""} ${configuredSite ? configuredSite.origin : ""} http://localhost:* http://127.0.0.1:*;
  font-src 'self' data:;
  connect-src 'self' ${configuredApi ? configuredApi.origin : ""} ${configuredSite ? configuredSite.origin : ""} http://localhost:* https://localhost:* http://127.0.0.1:*;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "https", hostname: "localhost", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
      ...(configuredApi
        ? [{ protocol: configuredApi.protocol.replace(":", "") as "http" | "https", hostname: configuredApi.hostname, port: configuredApi.port, pathname: "/**" }]
        : []),
      ...(configuredSite && (!configuredApi || configuredSite.hostname !== configuredApi.hostname)
        ? [{ protocol: configuredSite.protocol.replace(":", "") as "http" | "https", hostname: configuredSite.hostname, port: configuredSite.port, pathname: "/**" }]
        : []),
    ],
  },
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!backendUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
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
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
