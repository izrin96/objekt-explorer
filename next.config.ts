import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // not yet in use
  // cacheHandler:
  //   process.env.NODE_ENV === "production"
  //     ? require.resolve("./cache-handler.js")
  //     : undefined,
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
    ];
  },

  images: {
    unoptimized: true,
  },
};

export default nextConfig;
