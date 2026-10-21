import { expect, test } from "@playwright/test";

test.describe("/macro", () => {
  test("shows five Indonesia indicators with their latest year, from the World Bank", async ({
    page,
  }) => {
    await page.goto("/macro");
    const panel = page.getByRole("region", { name: "Indonesia at a glance" });
    await expect(panel.getByText(/World Bank/)).toBeVisible();
    const table = panel.getByRole("table", { name: /indonesia macro indicators/i });
    await expect(table.getByRole("rowheader")).toHaveCount(5);
    await expect(table.getByRole("row", { name: /Inflation/ })).toContainText("2025");
    await expect(
      table.getByRole("img", { name: /^GDP per capita, 2010–2025: from/ }),
    ).toBeAttached();
  });

  test("is reachable from the main navigation and credits the source in the footer", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .first()
      .getByRole("link", { name: "Macro" })
      .click();
    await expect(page).toHaveURL(/\/macro$/);
    await expect(page.locator("footer").getByRole("link", { name: "World Bank" })).toBeVisible();
  });

  test("/api/macro returns a data envelope with the shared cache header", async ({ request }) => {
    const res = await request.get("/api/macro");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toMatch(/s-maxage=\d+/);
    expect(await res.json()).toMatchObject({ status: "fresh", source: "worldbank" });
  });

  test("the warm-up cron accepts the macro scope", async ({ request }) => {
    const res = await request.post("/api/cron/warm?scope=macro", {
      headers: { authorization: "Bearer e2e-cron-secret-0123456789abcdef0123456789" },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data).toMatchObject({ scope: "macro" });
  });
});
