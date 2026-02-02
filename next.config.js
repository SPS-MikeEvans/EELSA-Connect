/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
  // Removed serverExternalPackages for pdfjs-dist as it conflicts with transpilePackages
  // and we are primarily using it client-side.
  transpilePackages: ["pdfjs-dist"], 
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    // Fix for pdfjs-dist 4+ in Next.js which uses .mjs
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
};

module.exports = nextConfig;
