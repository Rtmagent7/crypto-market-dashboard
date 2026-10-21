import { describe, expect, it } from "vitest";

import latest from "../../../tests/fixtures/frankfurter-latest.json";
import range from "../../../tests/fixtures/frankfurter-range-1y.json";

import { FfLatest, FfRange } from "./frankfurter.schema";

describe("Frankfurter schemas match real fixtures", () => {
  it("/latest has USD base and an IDR rate", () => {
    const parsed = FfLatest.parse(latest);
    expect(parsed.base).toBe("USD");
    expect(parsed.rates.IDR).toBeGreaterThan(10_000);
  });

  it("1-year range is keyed by business day", () => {
    const parsed = FfRange.parse(range);
    expect(Object.keys(parsed.rates).length).toBeGreaterThan(240);
  });
});
