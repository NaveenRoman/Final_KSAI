import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./java/**/*.md",
      "./cpp/**/*.md",
      "./content/**/*.md",
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: "/api/:path*",
      },
    ];
  },
};

export default nextConfig;
