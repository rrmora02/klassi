import { withSentryConfig } from "@sentry/nextjs";

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

    // Handle pdfkit - exclude from client bundle completely
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pdfkit': false,
        'stream': false,
        'fs': false,
        'buffer': false,
        'util': false,
        'zlib': false,
        'fontkit': false,
        'png-js': false,
      };
    } else {
      // On server, mark pdfkit as external to prevent bundling
      if (!config.externals) config.externals = [];
      if (Array.isArray(config.externals)) {
        config.externals.push('pdfkit');
      }
    }

    return config;
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "rtnservicesia",
  project: "javascript-nextjs",
});
