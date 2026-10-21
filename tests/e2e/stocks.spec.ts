import { expect, test } from "@playwright/test";

test.describe("/stocks", () => {
  test("shows the session state, the 8-ticker watchlist and a switchable chart", async ({
    page,
  }) => {
    await page.goto("/stocks");
    await expect(
      page.getByRole("status").filter({ hasText: /US market (open|closed)/ }),
    ).toBeVisible();

    const table = page.getByRole("table", { name: /US watchlist/ });
    await expect(table.getByRole("rowheader")).toHaveCount(8);
    await expect(table.getByRole("rowheader").first()).toContainText("AAPL");
    await expect(table.getByText(/[▲▼]/).first()).toBeVisible();

    const chart = page.getByRole("region", { name: "Price history" });
    await expect(chart.locator("canvas").first()).toBeVisible();
    await chart.getByLabel("Ticker").selectOption("NVDA");
    await expect(chart.getByText(/NVDA, 1 year: (up|down|flat)/)).toBeAttached();
    await chart.getByRole("tab", { name: "24 trading hours" }).click();
    await expect(chart.getByText(/NVDA, 24 trading hours:/)).toBeAttached();
  });

  test("the API returns the watchlist envelope", async ({ request }) => {
    const res = await request.get("/api/stocks");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("twelvedata");
    expect(body.data).toHaveLength(8);
  });
});
