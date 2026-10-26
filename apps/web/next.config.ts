import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/v1/:path*", destination: `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000"}/v1/:path*` }];
  },
  // Rebuild deterministically: persisted Turbopack cache failed to reopen in Work.
  experimental: { turbopackFileSystemCacheForBuild: false },
};

export default nextConfig;
