import { expect, test } from "@playwright/test";

test.describe("/fx", () => {
  test("converts on input, swaps currencies, and shows the 1-year chart", async ({ page }) => {
    await page.goto("/fx");
    const result = page.locator("#fx-result");

    await page.getByLabel("Amount").fill("250");
    await expect(result).toContainText("Rp"); // USD → IDR by default
    await page.getByRole("button", { name: "Swap currencies" }).click();
    await expect(result).toContainText("$");

    await page.getByLabel("Amount").fill("abc");
    await expect(result).toContainText("—");

    const history = page.getByRole("region", { name: "One year of USD rates" });
    await expect(history.locator("canvas").first()).toBeVisible();
    await expect(history.getByText(/USD\/IDR, 1 year: (up|down|flat)/)).toBeAttached();
    await history.getByRole("tab", { name: "USD/EUR" }).click();
    await expect(history.getByText(/USD\/EUR, 1 year:/)).toBeAttached();
  });

  test("keeps the TradingView attribution the chart license requires", async ({ page }) => {
    await page.goto("/fx");
    await expect(page.locator('a[href*="tradingview.com"]').first()).toBeAttached();
  });
});
