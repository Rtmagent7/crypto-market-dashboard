import { describe, expect, it } from "vitest";

import { ErOpenLatest } from "@/infra/providers/exchangerate.schema";
import { FfLatest, FfRange } from "@/infra/providers/frankfurter.schema";

import erLatest from "../../../tests/fixtures/exchangerate-latest-open.json";
import ffLatest from "../../../tests/fixtures/frankfurter-latest.json";
import ffRange from "../../../tests/fixtures/frankfurter-range-1y.json";

import { fromExchangeRate, fromFrankfurter, fromFrankfurterRange } from "./fx.mapper";

describe("fx mappers", () => {
  it("Frankfurter latest → FxRates", () => {
    const fx = fromFrankfurter(FfLatest.parse(ffLatest));
    expect(fx.base).toBe("USD");
    expect(fx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fx.rates.IDR).toBeGreaterThan(10_000);
  });

  it("ExchangeRate-API → the same FxRates shape, date from its update timestamp", () => {
    const fx = fromExchangeRate(ErOpenLatest.parse(erLatest));
    expect(fx.base).toBe("USD");
    expect(fx.date).toBe("2026-10-21");
    expect(fx.rates.IDR).toBeGreaterThan(10_000);
    expect(fx.rates.USD).toBeUndefined();
  });

  it("Frankfurter range → chronological PricePoints for one currency", () => {
    const points = fromFrankfurterRange(FfRange.parse(ffRange), "IDR");
    expect(points.length).toBeGreaterThan(240);
    expect(points[0]!.t < points[points.length - 1]!.t).toBe(true);
    expect(points.every((p) => p.v > 10_000)).toBe(true);
  });

  it("range without the currency → empty series", () => {
    expect(fromFrankfurterRange(FfRange.parse(ffRange), "XYZ")).toEqual([]);
  });
});
