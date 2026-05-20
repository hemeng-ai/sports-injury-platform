import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 跳过 node_modules 文件监听，避免 Windows 文件句柄耗尽导致崩溃
  webpack: (config) => {
    config.watchOptions = {
      ignored: /node_modules/,
    };
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
