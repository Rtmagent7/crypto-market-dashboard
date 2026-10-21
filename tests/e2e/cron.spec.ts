import { expect, test } from "@playwright/test";

const SECRET = "e2e-cron-secret-0123456789abcdef0123456789"; // matches playwright.config.ts

test.describe("/api/cron/warm", () => {
  test("rejects callers without the bearer secret", async ({ request }) => {
    expect((await request.post("/api/cron/warm?scope=market")).status()).toBe(401);
    expect(
      (
        await request.post("/api/cron/warm?scope=market", {
          headers: { authorization: "Bearer wrong" },
        })
      ).status(),
    ).toBe(401);
  });

  test("rejects unknown scopes", async ({ request }) => {
    const res = await request.post("/api/cron/warm?scope=all", {
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(res.status()).toBe(400);
  });

  test("warms a scope through the normal services", async ({ request }) => {
    const res = await request.post("/api/cron/warm?scope=market", {
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("no-store");
    const body = await res.json();
    expect(body.data).toMatchObject({
      scope: "market",
      results: { top50: "fresh", global: "fresh", trending: "fresh" },
    });
  });
});
