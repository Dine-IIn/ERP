/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@nexaerp/shared-types"]
};

export default nextConfig;
