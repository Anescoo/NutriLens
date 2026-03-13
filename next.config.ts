import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include only the Prisma binary engine (.node file) in the serverless function bundle.
  // The TS source files are already bundled by Next.js — only the native binary needs explicit inclusion.
  outputFileTracingIncludes: {
    '/api/**/*': ['./src/generated/prisma/*.node'],
  },
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
