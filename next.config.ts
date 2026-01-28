import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // ไม่ใช้ standalone เพราะมี custom server (server.js)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // จำกัด memory cache เพื่อป้องกัน memory leak
  cacheMaxMemorySize: 50 * 1024 * 1024, // 50MB max cache
  // ลด memory usage ตอน build
  productionBrowserSourceMaps: false,
  // ปิด image optimization ถ้าไม่ได้ใช้ (ประหยัด memory)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
