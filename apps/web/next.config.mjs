/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@rasure/core"],
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};
export default nextConfig;
