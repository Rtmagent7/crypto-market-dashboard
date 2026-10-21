import { describe, expect, it } from "vitest";

import { selectRange, sparklineToPoints } from "./coin-chart";

const HOUR = 3_600_000;
const END = Date.parse("2026-10-21T16:00:00Z");
const hourly = Array.from({ length: 721 }, (_, i) => ({
  t: new Date(END - (720 - i) * HOUR).toISOString(),
  v: i,
}));

describe("selectRange", () => {
  it("1d is the last 24 hours of the hourly 30-day series", () => {
    const day = selectRange("1d", hourly);
    expect(day.length).toBe(25);
    expect(day[0]!.t).toBe(new Date(END - 24 * HOUR).toISOString());
  });

  it("30d and 1y return the series unchanged", () => {
    expect(selectRange("30d", hourly)).toHaveLength(721);
  });
});

describe("sparklineToPoints", () => {
  it("timestamps the 168 hourly sparkline values backwards from the asset's update time", () => {
    const pts = sparklineToPoints([1, 2, 3], "2026-10-21T16:00:00.000Z");
    expect(pts).toEqual([
      { t: "2026-10-21T14:00:00.000Z", v: 1 },
      { t: "2026-10-21T15:00:00.000Z", v: 2 },
      { t: "2026-10-21T16:00:00.000Z", v: 3 },
    ]);
  });
});
