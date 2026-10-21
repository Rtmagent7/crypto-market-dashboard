import { expect, test } from "@playwright/test";

test.describe("/status", () => {
  test("lists every provider with a state, a quota meter and data age", async ({ page }) => {
    await page.goto("/"); // let the guard fetch something worth reporting
    await page.goto("/status");
    const table = page.getByRole("table", { name: /provider status/i });
    await expect(table.getByRole("rowheader")).toHaveCount(9);
    for (const name of ["CoinGecko", "Twelve Data", "Frankfurter", "Groq"]) {
      await expect(table.getByRole("rowheader", { name: new RegExp(name) })).toBeVisible();
    }
    const meter = page.getByRole("meter", { name: "CoinGecko quota" });
    await expect(meter).toHaveAttribute("aria-valuemax", "8000");
    await expect(meter).toHaveAttribute("aria-valuetext", /of this month's cap/);
    await expect(table.getByText("Operational").first()).toBeVisible();
  });

  test("the API is never cached", async ({ request }) => {
    const res = await request.get("/api/status");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("no-store");
    expect((await res.json()).source).toBe("internal");
  });
});
