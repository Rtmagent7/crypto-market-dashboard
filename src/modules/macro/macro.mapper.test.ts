import { describe, expect, it } from "vitest";

import { MACRO_INDICATORS } from "@/config/macro";
import { WbIndicators } from "@/infra/providers/worldbank.schema";

import indicators from "../../../tests/fixtures/worldbank-indicators.json";

import { fromWorldBank } from "./macro.mapper";

const wb = WbIndicators.parse(indicators);

describe("fromWorldBank", () => {
  it("returns every whitelisted indicator, in config order, with config labels", () => {
    const out = fromWorldBank(wb);
    expect(out.map((i) => i.id)).toEqual(MACRO_INDICATORS.map((i) => i.id));
    expect(out[1]).toMatchObject({ label: "Inflation", unit: "percent" });
  });

  it("orders each history oldest first, keyed by year", () => {
    const gdp = fromWorldBank(wb)[0]!;
    expect(gdp.history[0]!.t).toBe("2010");
    const years = gdp.history.map((p) => Number(p.t));
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it("drops unpublished (null) years and rows outside the whitelist", () => {
    const [meta, rows] = wb;
    const extra = { ...rows[0]!, indicator: { id: "XX.UNKNOWN", value: "?" } };
    const unpublished = { ...rows[0]!, date: "2026", value: null };
    const out = fromWorldBank([meta, [...rows, extra, unpublished]]);
    expect(out.map((i) => i.id)).not.toContain("XX.UNKNOWN");
    expect(out[0]!.history.at(-1)!.t).toBe("2025");
  });

  it("keeps an indicator with no published data as an empty history", () => {
    const [meta, rows] = wb;
    const out = fromWorldBank([meta, rows.filter((r) => r.indicator.id !== "SL.UEM.TOTL.ZS")]);
    expect(out.find((i) => i.id === "SL.UEM.TOTL.ZS")!.history).toEqual([]);
  });
});
