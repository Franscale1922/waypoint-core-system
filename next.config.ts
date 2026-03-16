import type { NextConfig } from "next";

const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://asset-tidycal.b-cdn.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://asset-tidycal.b-cdn.net",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://tidycal.com https://api.tidycal.com",
  "frame-src 'self' https://tidycal.com",
  "frame-ancestors 'none'",
].join('; ');


const securityHeaders = [
  // Prevents clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevents MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Controls referrer info sent with requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disables browser features you don't use
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Content Security Policy
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
  // Forces HTTPS for 2 years (only meaningful in production)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/blog/:path*',
        destination: '/resources/:path*',
        permanent: true,
      },
      {
        source: '/tools',
        destination: '/quizzes',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Long-lived cache for public images (immutable — filenames don't change)
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Short-lived cache for OG images (may be regenerated)
        source: '/:og*.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
