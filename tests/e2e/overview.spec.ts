import { expect, test } from "@playwright/test";

// Runs against the production build with MOCK_PROVIDERS=1: real captured fixtures, zero quota.

test.describe("overview with market data", () => {
  test("shows the pulse, the top-50 table and trending, each naming its source", async ({
    page,
  }) => {
    await page.goto("/");
    const pulse = page.getByRole("region", { name: "Market pulse" });
    await expect(pulse.getByText(/^\$\d+(\.\d+)?T$/)).toBeVisible();

    const table = page.getByRole("table", { name: /top 50 cryptocurrencies/i });
    await expect(table.locator("tbody tr")).toHaveCount(50);
    await expect(table.getByRole("rowheader").first()).toContainText("BTC");

    const trending = page.getByRole("region", { name: "Trending" });
    await expect(trending.getByRole("listitem")).toHaveCount(5);
    await expect(page.getByText("CoinGecko", { exact: true }).first()).toBeVisible();
  });

  test("sorting and density change the table without a reload", async ({ page }) => {
    await page.goto("/");
    const table = page.getByRole("table", { name: /top 50 cryptocurrencies/i });
    const firstRow = table.locator("tbody tr").first();
    const compactHeight = (await firstRow.boundingBox())!.height;

    await page.getByRole("button", { name: "Comfortable" }).click();
    await expect
      .poll(async () => (await firstRow.boundingBox())!.height)
      .toBeGreaterThan(compactHeight);

    await table.getByRole("button", { name: /24h/ }).click();
    await expect(table.getByRole("columnheader", { name: /24h/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  test("the browser polls only the internal API, never a provider", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      const host = new URL(r.url()).host;
      if (/coingecko|twelvedata|frankfurter|groq/.test(host) && !host.startsWith("coin-images"))
        external.push(r.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(external).toEqual([]);
  });

  test("shows the AI brief as plain text with its model, prompt version and disclaimer", async ({
    page,
  }) => {
    await page.goto("/");
    const brief = page.getByRole("region", { name: "AI market brief" });
    await expect(brief.getByText(/Bitcoin/)).toBeVisible();
    await expect(brief.getByText(/Educational summary, not financial advice\./)).toBeVisible();
    await expect(
      brief.getByText(/openai\/gpt-oss-120b · prompt \d{4}-\d{2}-\d{2}\.\d+/),
    ).toBeVisible();
    await expect(brief.locator("a[href^='http']")).toHaveCount(0);
  });
});
