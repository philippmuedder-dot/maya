/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint runs separately in CI; skip during builds to avoid Node 25 plugin compat issues
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
