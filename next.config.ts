import type { NextConfig } from "next";

const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://www.google-analytics.com https://analytics.google.com",
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
    ];
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
