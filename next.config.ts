import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-opcua-client", "influx"],
  devIndicators: false,
};

export default nextConfig;
