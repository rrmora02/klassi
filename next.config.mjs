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
    return config;
  },
};

export default nextConfig;
