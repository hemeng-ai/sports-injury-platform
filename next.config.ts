import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 开发模式下 turbopack 暂不启用（shadcn/ui 兼容性）
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb", // 允许大文件上传
    },
  },
};

export default nextConfig;
