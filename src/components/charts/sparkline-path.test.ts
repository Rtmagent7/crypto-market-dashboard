import { describe, expect, it } from "vitest";

import { sparklineGeometry } from "./sparkline-path";

describe("sparklineGeometry", () => {
  it("maps values into the box, highest value at the top", () => {
    const g = sparklineGeometry([1, 3, 2], 100, 20, 2)!;
    expect(g.path).toBe("M2,18 L50,2 L98,10");
    expect(g.last).toEqual({ x: 98, y: 10 });
  });

  it("reports the 7-day direction and change", () => {
    expect(sparklineGeometry([100, 90, 110], 96, 28)!.trend).toEqual({
      direction: "up",
      changePct: 10,
    });
    expect(sparklineGeometry([100, 120, 80], 96, 28)!.trend).toEqual({
      direction: "down",
      changePct: -20,
    });
  });

  it("draws a flat line for constant series and nothing for empty ones", () => {
    expect(sparklineGeometry([5, 5, 5], 96, 28)!.path).toBe("M2,14 L48,14 L94,14");
    expect(sparklineGeometry([], 96, 28)).toBeNull();
  });

  it("downsamples long series to at most `maxPoints` points", () => {
    const values = Array.from({ length: 168 }, (_, i) => i);
    const g = sparklineGeometry(values, 96, 28, 2, 48)!;
    expect(g.path.split(" ").length).toBeLessThanOrEqual(48);
    expect(g.last.x).toBe(94);
  });
});
