import { describe, expect, it } from "vitest";

import { summarizeSeries, toChartTime } from "./chart-summary";

describe("summarizeSeries", () => {
  it("reports first, last, low, high and the change", () => {
    const s = summarizeSeries([
      { t: "2026-01-01", v: 100 },
      { t: "2026-01-02", v: 80 },
      { t: "2026-01-03", v: 120 },
      { t: "2026-01-04", v: 110 },
    ])!;
    expect(s).toMatchObject({
      first: 100,
      last: 110,
      low: 80,
      high: 120,
      changePct: 10,
      direction: "up",
    });
    expect(s.from).toBe("2026-01-01");
    expect(s.to).toBe("2026-01-04");
  });

  it("returns null for an empty series", () => {
    expect(summarizeSeries([])).toBeNull();
  });
});

describe("toChartTime", () => {
  it("keeps business days as strings and turns timestamps into UTC seconds", () => {
    expect(toChartTime("2026-10-21")).toBe("2026-10-21");
    expect(toChartTime("2026-10-21T10:00:00.000Z")).toBe(1792576800);
  });
});
