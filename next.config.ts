import type { NextConfig } from "next";

// Baseline security headers applied to every response.
// NOTE: A Content-Security-Policy is intentionally NOT set here yet —
// Stripe Checkout, Supabase, and Resend tracking pixels all need allow-listed
// origins, and a misconfigured CSP will silently break payments. Add CSP via
// a dedicated PR after testing each integration end-to-end.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://js.stripe.com\" \"https://checkout.stripe.com\")" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
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
