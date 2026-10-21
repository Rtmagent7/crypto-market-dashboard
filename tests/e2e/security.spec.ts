import { expect, test } from "@playwright/test";

test.describe("security", () => {
  test("pages and API responses carry the security headers, with no CORS", async ({ request }) => {
    for (const path of ["/", "/api/market"]) {
      const h = (await request.get(path)).headers();
      expect(h["content-security-policy"]).toContain("default-src 'self'");
      expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(h["strict-transport-security"]).toContain("max-age=63072000");
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["x-frame-options"]).toBe("DENY");
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["access-control-allow-origin"]).toBeUndefined();
      expect(h["x-powered-by"]).toBeUndefined();
    }
  });

  test("the CSP does not break the app (no violations in the console)", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|CSP/i.test(m.text())) violations.push(m.text());
    });
    for (const path of ["/", "/fx", "/coins/bitcoin", "/stocks", "/status"]) {
      await page.goto(path, { waitUntil: "networkidle" });
    }
    expect(violations).toEqual([]);
  });

  test("/api/* is rate limited per hashed client IP with Retry-After and RateLimit headers", async ({
    request,
  }) => {
    // A dedicated client address keeps this flood from draining the other tests' budget.
    const headers = { "x-forwarded-for": "203.0.113.99" };
    let last = await request.get("/api/market", { headers });
    expect(last.headers()["ratelimit-limit"]).toBe("120");
    for (let i = 0; i < 125 && last.status() !== 429; i++) {
      last = await request.get("/api/market", { headers });
    }
    expect(last.status()).toBe(429);
    expect(Number(last.headers()["retry-after"])).toBeGreaterThan(0);
    expect(last.headers()["ratelimit-remaining"]).toBe("0");

    const other = await request.get("/api/market", {
      headers: { "x-forwarded-for": "198.51.100.7" },
    });
    expect(other.status()).toBe(200);
  });
});
