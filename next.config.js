import "./src/env.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Optimize file watching
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    
    return config;
  },
  // Increase memory limit for development
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
      allowedOrigins: ['*'],
    },
  },
  // Optimize image loading
  images: {
    domains: ['drive.google.com', 'lh3.googleusercontent.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
