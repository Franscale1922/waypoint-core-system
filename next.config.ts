import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/blog/:path*',
        destination: '/resources/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
