/**
 * Security headers (spec §11; Helmet's set, applied by next.config `headers()`).
 * CSP strategy: ADR 0010 — static/PPR pages cannot carry per-request nonces, so inline scripts
 * are allowed while every external origin is not.
 */

const IMAGE_HOSTS = ["https://coin-images.coingecko.com", "https://assets.coingecko.com"];

export const contentSecurityPolicy = (vercelEnv: string | undefined): string => {
  const preview = vercelEnv === "preview";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js streams RSC payloads in inline <script> tags on prerendered pages (no nonce possible).
    "script-src": ["'self'", "'unsafe-inline'", ...(preview ? ["https://vercel.live"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...IMAGE_HOSTS],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      ...(preview ? ["https://vercel.live", "wss://ws-us3.pusher.com"] : []),
    ],
    "frame-src": preview ? ["https://vercel.live"] : ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
};

export const securityHeaders = (
  vercelEnv: string | undefined,
): { key: string; value: string }[] => [
  { key: "Content-Security-Policy", value: contentSecurityPolicy(vercelEnv) },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
