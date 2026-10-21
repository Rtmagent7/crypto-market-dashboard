import { expect, test, type Page } from "@playwright/test";

// Spec 9A visual acceptance: every MVP page at 390 / 768 / 1440 px in both themes, against
// committed baselines. Data comes from the real captured fixtures (mock providers), so it is
// stable; what legitimately changes over time is masked.

const PAGES = [
  { name: "overview", path: "/" },
  { name: "coin", path: "/coins/bitcoin" },
  { name: "fx", path: "/fx" },
  { name: "stocks", path: "/stocks" },
  { name: "macro", path: "/macro" },
  { name: "status", path: "/status" },
] as const;
const WIDTHS = [390, 768, 1440] as const;
const THEMES = ["light", "dark"] as const;

const dynamicParts = (page: Page): ReturnType<Page["locator"]>[] => [
  page.locator("time"), // relative ages and "data as of" clock times
  page.getByTestId("freshness-rail"), // shrinks with wall-clock time
  page.locator("canvas"), // GPU-rendered chart surfaces
  page.getByRole("region", { name: "Price history" }), // cold-cache dependent (8 credits/min)
  page.getByRole("region", { name: "Watchlist" }).locator("td:last-child"), // hourly sparklines, same
  page.getByRole("region", { name: "AI market brief" }).locator("p").first(),
  // /status reports live counters that other tests change; compare its layout, not its numbers.
  page.getByRole("table", { name: /provider status/i }).locator("tbody td"),
];

for (const theme of THEMES) {
  test.describe(`visual ${theme}`, () => {
    test.use({ colorScheme: theme });

    for (const width of WIDTHS) {
      for (const { name, path } of PAGES) {
        test(`${name} @ ${width}`, async ({ page }) => {
          await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
          await page.goto(path, { waitUntil: "networkidle" });
          await page.mouse.move(width - 2, 2); // keep the nav rail collapsed
          await page.evaluate(() => document.fonts.ready);
          await expect(page).toHaveScreenshot(`${name}-${width}-${theme}.png`, {
            mask: dynamicParts(page),
          });
        });
      }
    }
  });
}
