import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Treat Prisma and pdf-parse as external Node.js modules (not bundled by webpack).
  // @prisma/client uses __dirname to locate its binary engine; bundling breaks that resolution.
  serverExternalPackages: ['@prisma/client', 'prisma', 'pdf-parse', 'unpdf'],
  transpilePackages: ['recharts'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.openfoodfacts.org' },
      { protocol: 'https', hostname: '**.openfoodfacts.net' },
    ],
  },
};

export default nextConfig;
