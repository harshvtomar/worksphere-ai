import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Rebuild deterministically: persisted Turbopack cache failed to reopen in Work.
  experimental: { turbopackFileSystemCacheForBuild: false },
};

export default nextConfig;
