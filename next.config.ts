import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Allow larger uploads through middleware
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
