import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // for Turbopack HMR from local IP
  allowedDevOrigins: ['192.168.1.2','192.168.110.213'],
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/organsier',
        destination: '/organizer',
        permanent: true,
      },
      {
        source: '/organsier/:path*',
        destination: '/organizer/:path*',
        permanent: true,
      },
      {
        source: '/organiser',
        destination: '/organizer',
        permanent: true,
      },
      {
        source: '/organiser/:path*',
        destination: '/organizer/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/__/:path*',
        destination: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com/__/:path*`,
      },
    ];
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Organization and project in Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from generated client bundles
  hideSourceMaps: true,

  // Disable Sentry webpack plugin in development
  disableLogger: true,
};

// Only wrap with Sentry if DSN is configured
const config = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

export default config;
