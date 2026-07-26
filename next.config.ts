import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-auth", "@prisma/client"],
};

export default nextConfig;
