import type { NextConfig } from "next";

const configuredApi = process.env.NEXT_PUBLIC_API_BASE_URL ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL) : undefined;

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: configuredApi ? [{ protocol: configuredApi.protocol.replace(":", "") as "http" | "https", hostname: configuredApi.hostname, port: configuredApi.port, pathname: "/api/media/**" }] : [],
  },
};

export default nextConfig;
