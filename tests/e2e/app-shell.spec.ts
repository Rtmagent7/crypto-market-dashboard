import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  { path: "/", heading: "Market overview" },
  { path: "/stocks", heading: "Stocks" },
  { path: "/fx", heading: "FX" },
  { path: "/status", heading: "Status" },
] as const;

const THEMES = ["light", "dark"] as const;

const collectConsoleErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
};

for (const theme of THEMES) {
  test.describe(`app shell (${theme})`, () => {
    test.use({ colorScheme: theme });

    for (const { path, heading } of PAGES) {
      test(`${path} renders landmarks with no console errors or serious a11y violations`, async ({
        page,
      }) => {
        const errors = collectConsoleErrors(page);
        await page.goto(path);

        await expect(page.getByRole("heading", { level: 1, name: heading })).toBeAttached();
        await expect(page.locator("main#main")).toBeVisible();
        await expect(page.getByRole("contentinfo")).toContainText("CoinGecko");

        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  });
}

test("theme toggle persists the choice across reloads", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: /theme\. switch to/i }).first();

  await toggle.click(); // system → light
  await expect(html).toHaveAttribute("data-theme", "light");
  await toggle.click(); // light → dark
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("skip link moves focus to main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});
