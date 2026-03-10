import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude pdf-parse (and its pdfjs-dist dependency) from bundling —
  // load them directly as Node.js modules at runtime instead.
  serverExternalPackages: ['pdf-parse', 'unpdf'],
  transpilePackages: ['recharts'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.openfoodfacts.org' },
      { protocol: 'https', hostname: '**.openfoodfacts.net' },
    ],
  },
};

export default nextConfig;
