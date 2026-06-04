import type { NextConfig } from "next";

// Stripe Checkout is used via redirect (no embedded JS/Elements), so
// js.stripe.com does not need to appear in script-src or connect-src.
// Google Fonts are inlined at build time by next/font, so font-src stays 'self'.
// Supabase Realtime (WebSocket) is not used, so wss:// is omitted from connect-src.
//
// Running as Report-Only — flip the key to "Content-Security-Policy" once a
// week of violation reports confirms there are no legitimate blocked sources.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' required for Next.js hydration scripts; remove once nonces are adopted.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
  "font-src 'self'",
  // Supabase auth client makes REST calls to the project URL.
  "connect-src 'self' https://*.supabase.co",
  "frame-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
  "report-uri /api/csp-report",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy-Report-Only", value: CSP },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  images: {
    // Skip Vercel's image optimizer for remote sources. Supabase Storage already
    // serves cached, CDN-fronted assets — passing them through /_next/image burns
    // the free-plan optimization quota for negligible benefit. Width/height props
    // still work as layout hints; the browser just fetches the URL directly.
    unoptimized: true,
    remotePatterns: [
      {
        // Supabase Storage
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Google profile pictures (OAuth avatars)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Seed placeholder images
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
