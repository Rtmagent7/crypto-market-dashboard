import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

import { securityHeaders } from "./src/config/security-headers";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  // Replaces route-segment `revalidate`: data freshness is set per cached scope with
  // `'use cache'` + `cacheLife()` (see docs/adr/0009-cache-components.md).
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env.VERCEL_ENV) }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "s2.coinmarketcap.com" },
    ],
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withBundleAnalyzer(nextConfig);
