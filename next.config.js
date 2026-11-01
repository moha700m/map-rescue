/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_EXPORT === '1';
const basePath = process.env.PAGES_BASE_PATH || '';

const nextConfig = {
  ...(isExport ? { output: 'export', trailingSlash: true } : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
  },
};

module.exports = nextConfig;
