import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Mock mode replays a real captured Groq stream. Every test uses its own client address, so the
// 5-questions-a-day limit of one test never affects another.

test.describe("Ask AI", () => {
  test("streams an answer into the dialog, with the disclaimer and questions left", async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": "192.0.2.10" });
    await page.goto("/");
    const brief = page.getByRole("region", { name: "AI market brief" });
    await brief.getByRole("button", { name: "Ask AI" }).click();

    const dialog = page.getByRole("dialog", { name: "Ask AI about the market" });
    await expect(dialog).toContainText("not financial advice");
    await dialog.getByLabel("Your question").fill("How is Bitcoin doing today?");
    await dialog.getByRole("button", { name: "Ask" }).click();

    await expect(dialog.getByText("4 questions left today")).toBeVisible();
    await expect(dialog.locator("[aria-live=polite]")).toContainText(/\w{3,}/);
    expect(
      (await new AxeBuilder({ page }).include("[role=dialog]").analyze()).violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(brief.getByRole("button", { name: "Ask AI" })).toBeFocused();
  });

  test("allows 5 questions per client per day, then 429 with a message", async ({
    request,
    baseURL,
  }) => {
    const headers = { origin: baseURL!, "x-forwarded-for": "192.0.2.20" };
    for (let i = 0; i < 5; i++) {
      const res = await request.post("/api/ai/chat", {
        headers,
        data: { question: `Question number ${i + 1}?` },
      });
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("text/event-stream");
      expect(await res.text()).toContain("event: done");
    }
    const sixth = await request.post("/api/ai/chat", { headers, data: { question: "One more?" } });
    expect(sixth.status()).toBe(429);
    expect((await sixth.json()).error).toContain("5 questions today");
  });

  test("rejects cross-site requests and invalid questions before calling the AI", async ({
    request,
    baseURL,
  }) => {
    const xff = { "x-forwarded-for": "192.0.2.30" };
    const crossSite = await request.post("/api/ai/chat", {
      headers: { ...xff, origin: "https://evil.example" },
      data: { question: "Is this allowed?" },
    });
    expect(crossSite.status()).toBe(403);

    for (const question of ["hi", "x".repeat(501)]) {
      const res = await request.post("/api/ai/chat", {
        headers: { ...xff, origin: baseURL! },
        data: { question },
      });
      expect(res.status()).toBe(400);
    }
  });
});
