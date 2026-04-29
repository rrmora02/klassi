/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Only apply watch options on development and client
    if (dev && !isServer) {
        config.watchOptions = {
            ...config.watchOptions,
            // Ignorar root de windows y archivos del sistema
            ignored: [
                '**/node_modules',
                '**/.*',
                'c:/*.sys',
                'c:/*.tmp',
                'c:/*.log',
            ],
        };
    }

    // Handle pdfkit - only use on server side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pdfkit': false,
        'stream': false,
        'fs': false,
        'buffer': false,
        'util': false,
      };
    }

    return config;
  },
};

export default nextConfig;
