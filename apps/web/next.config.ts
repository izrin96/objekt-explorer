import type { NextConfig } from "next";

import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
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
    ];
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@aws-sdk/client-ses"],
};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: "./messages/en.json",
  },
});

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(withNextIntl(nextConfig));
