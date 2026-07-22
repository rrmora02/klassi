import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Stop MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Force HTTPS for 2 years, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Block cross-origin info leakage in Referer header
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Content Security Policy
  // - default-src 'self': only load resources from same origin by default
  // - script-src: allow same-origin + unsafe-inline (required by Next.js) + Clerk + Sentry
  // - style-src: allow same-origin + inline styles (required by Next.js/Tailwind)
  // - img-src: allow same-origin, data URIs, and known CDNs
  // - connect-src: allow API calls to Clerk, Sentry, and Stripe
  // - frame-src: allow Clerk hosted pages
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.klassi.io https://*.clerk.accounts.dev https://js.stripe.com https://cdn.jsdelivr.net https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.sentry.io https://api.stripe.com https://challenges.cloudflare.com https://*.supabase.co wss:",
      "frame-src 'self' https://js.stripe.com https://*.clerk.com https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
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
