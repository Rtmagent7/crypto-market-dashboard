import { expect, test } from "@playwright/test";

test.describe("coin detail", () => {
  test("opens from the overview with the keyboard, switches ranges, shows stats", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // keyboard handlers exist only after hydration
    const firstRow = page
      .getByRole("table", { name: /top 50/i })
      .locator("tbody tr")
      .first();
    await firstRow.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/coins\/bitcoin$/);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bitcoin");
    const chart = page.getByRole("region", { name: "Bitcoin price" });
    await expect(chart.locator("canvas").first()).toBeVisible();
    await chart.getByRole("tab", { name: "1Y" }).click();
    await expect(chart.getByText(/Bitcoin, 1Y: (up|down|flat)/)).toBeAttached();
    await chart.getByRole("tab", { name: "7D" }).click();
    await expect(chart.getByText(/Bitcoin, 7D: (up|down|flat)/)).toBeAttached();

    const stats = page.getByRole("region", { name: "Market stats" });
    await expect(stats.getByText("All-time high")).toBeVisible();
    await expect(stats.getByText("#1")).toBeVisible();
  });

  test("an unknown coin is a 404 page", async ({ page }) => {
    const res = await page.goto("/coins/dogecoin");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found." })).toBeVisible();
  });

  test("the chart API rejects out-of-whitelist input before touching the cache", async ({
    request,
  }) => {
    expect((await request.get("/api/coins/bitcoin/chart?range=5y")).status()).toBe(400);
    expect((await request.get("/api/coins/..%2F..%2Fetc/chart")).status()).toBeGreaterThanOrEqual(
      400,
    );
    expect((await request.get("/api/coins/dogecoin/chart")).status()).toBe(404);
    const ok = await request.get("/api/coins/bitcoin/chart?range=30d");
    expect(ok.status()).toBe(200);
    expect((await ok.json()).data.length).toBeGreaterThan(700);
  });
});
