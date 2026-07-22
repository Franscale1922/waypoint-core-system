import type { NextConfig } from "next";

// React + Turbopack require eval() in development for debugging features
// (reconstructing call stacks, etc.). Production React never uses eval(), so
// 'unsafe-eval' is added ONLY in dev — the production CSP stays locked down.
const isDev = process.env.NODE_ENV !== "production";
const devEval = isDev ? " 'unsafe-eval'" : "";

const ContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval} https://www.googletagmanager.com https://www.google-analytics.com https://asset-tidycal.b-cdn.net https://f.vimeocdn.com https://apis.chatbot.revscaleapps.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://asset-tidycal.b-cdn.net",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://tidycal.com https://api.tidycal.com https://vimeo.com https://fresnel.vimeocdn.com https://apis.chatbot.revscaleapps.com",
  "frame-src 'self' https://tidycal.com https://player.vimeo.com",
  "worker-src 'self' blob: https://apis.chatbot.revscaleapps.com",
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
  images: {
    // Extend next/image cache from default 1 day to 1 year.
    // This eliminates the "Use efficient cache lifetimes" PageSpeed flag on processed images.
    minimumCacheTTL: 31536000,
  },
  experimental: {
    // Tree-shake large packages at build time — reduces unused JS in bundles.
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  async redirects() {
    return [
      // Canonical domain: non-www → www (permanent 301)
      // Without this, Vercel issues a 307 temporary redirect which confuses Googlebot
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'waypointfranchise.com' }],
        destination: 'https://www.waypointfranchise.com/:path*',
        permanent: true,
      },
      {
        source: '/blog/:path*',
        destination: '/resources/:path*',
        permanent: true,
      },


      // Suppress WordPress 404s from old bot crawls (GSC "Not found" errors)
      {
        source: '/wp-content/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-admin/:path*',
        destination: '/',
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
        // Agent discovery (RFC 8288): advertise the machine-readable site
        // description at /llms.txt via the registered "describedby" relation.
        // Scoped to HTML document routes only — the negative lookahead excludes
        // /_next, /api, and any path with a file extension (/llms.txt itself,
        // images, sitemap.xml, robots.txt) so the header doesn't leak onto
        // asset/binary responses or self-reference llms.txt.
        source: '/((?!_next/|api/|.*\\.).*)',
        headers: [
          { key: 'Link', value: '</llms.txt>; rel="describedby"; type="text/plain"' },
        ],
      },
      {
        // Content-rich pages serve HTML to browsers and markdown to agents that
        // send `Accept: text/markdown` (see middleware.ts). Advertise Vary: Accept
        // so any intermediary cache keys the two representations separately.
        source: '/resources/:slug*',
        headers: [{ key: 'Vary', value: 'Accept' }],
      },
      {
        source: '/resources',
        headers: [{ key: 'Vary', value: 'Accept' }],
      },
      {
        source: '/glossary',
        headers: [{ key: 'Vary', value: 'Accept' }],
      },
      {
        source: '/faq',
        headers: [{ key: 'Vary', value: 'Accept' }],
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
      {
        // Long-lived cache for next/image processed images (content-addressed URLs — safe to cache permanently).
        // Fixes PageSpeed "Use efficient cache lifetimes" flag on /_next/image URLs.
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
