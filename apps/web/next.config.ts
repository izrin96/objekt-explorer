import type { NextConfig } from "next";
import { withIntlayer } from "next-intlayer/server";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  compress: false,
  experimental: {
    optimizePackageImports: ["react-aria-components", "@phosphor-icons/react"],
  },
  typedRoutes: true,
  async rewrites() {
    return [
      {
        source: "/@:nickname",
        destination: "/profile/:nickname",
      },
      {
        source: "/@:nickname/trades",
        destination: "/profile/:nickname/trades",
      },
      {
        source: "/@:nickname/progress",
        destination: "/profile/:nickname/progress",
      },
      {
        source: "/@:nickname/stats",
        destination: "/profile/:nickname/stats",
      },
      {
        source: "/@:nickname/list",
        destination: "/profile/:nickname/list",
      },
      {
        source: "/@:nickname/list/:slug",
        destination: "/profile-list/:nickname/:slug",
      },
    ];
  },
  images: {
    unoptimized: true,
  },
};

export default withIntlayer(nextConfig);
