import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const csp = (env?: string): Record<string, string> =>
  Object.fromEntries(
    contentSecurityPolicy(env)
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => [d.split(" ")[0]!, d.split(" ").slice(1).join(" ")]),
  );

describe("contentSecurityPolicy (spec §11)", () => {
  it("allows only same-origin by default, no plugins, no framing", () => {
    const p = csp("production");
    expect(p["default-src"]).toBe("'self'");
    expect(p["connect-src"]).toBe("'self'");
    expect(p["object-src"]).toBe("'none'");
    expect(p["frame-ancestors"]).toBe("'none'");
    expect(p["base-uri"]).toBe("'self'");
    expect(p["form-action"]).toBe("'self'");
  });

  it("limits images to self and the CoinGecko image host", () => {
    expect(csp("production")["img-src"]).toBe(
      "'self' data: blob: https://coin-images.coingecko.com https://assets.coingecko.com",
    );
  });

  it("never allows eval in production, and only adds Vercel's toolbar on previews", () => {
    expect(csp("production")["script-src"]).not.toContain("unsafe-eval");
    expect(csp("production")["script-src"]).not.toContain("vercel.live");
    expect(csp("preview")["script-src"]).toContain("https://vercel.live");
  });
});

describe("securityHeaders", () => {
  it("sets HSTS, nosniff, DENY framing, referrer and permissions policies", () => {
    const h = Object.fromEntries(securityHeaders("production").map((x) => [x.key, x.value]));
    expect(h["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains; preload");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toContain("camera=()");
    expect(h["Content-Security-Policy"]).toContain("default-src 'self'");
  });

  it("sends no CORS headers: the API is same-origin only", () => {
    expect(
      securityHeaders("production").some((x) => x.key.toLowerCase().startsWith("access-control")),
    ).toBe(false);
  });
});
