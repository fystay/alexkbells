import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";
import { bookingConfigWarning } from "./src/lib/booking";

// Surface the launch blocker in the Vercel build log rather than failing the build.
const bookingWarning = bookingConfigWarning();
if (bookingWarning) console.warn(`\n⚠ Launch blocker: ${bookingWarning}\n`);

const nextConfig: NextConfig = {
  // Tests only: lets e2e build a second, production-configured copy alongside the default one.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
