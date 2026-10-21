import { expect, test } from "@playwright/test";

// WCAG 2.4.7 / 2.4.11: every element reached with Tab shows a visible focus indicator.
for (const path of ["/", "/fx", "/coins/bitcoin", "/stocks", "/status"]) {
  test(`${path}: Tab reaches controls in order, each with a visible focus ring`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path, { waitUntil: "networkidle" });
    const seen: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const focus = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const visible =
          (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
        return {
          label: `${el.tagName.toLowerCase()}:${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30)}`,
          visible,
        };
      });
      if (!focus) continue;
      seen.push(focus.label);
      expect(focus.visible, `no visible focus on ${focus.label}`).toBe(true);
    }
    expect(seen.length).toBeGreaterThan(5);
    expect(seen[0]).toContain("Skip to content");
  });
}
