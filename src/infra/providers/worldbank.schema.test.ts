import { describe, expect, it } from "vitest";

import { MACRO_INDICATORS } from "@/config/macro";

import error from "../../../tests/fixtures/worldbank-error.json";
import indicators from "../../../tests/fixtures/worldbank-indicators.json";

import { WbIndicators, isWbError } from "./worldbank.schema";

describe("World Bank schemas match real fixtures", () => {
  it("multi-indicator response is [page meta, rows] with one row per indicator and year", () => {
    const [meta, rows] = WbIndicators.parse(indicators);
    expect(meta.total).toBe(rows.length);
    expect(new Set(rows.map((r) => r.indicator.id))).toEqual(
      new Set(MACRO_INDICATORS.map((i) => i.id)),
    );
    expect(rows.every((r) => r.countryiso3code === "IDN" && /^\d{4}$/.test(r.date))).toBe(true);
  });

  it("an error arrives as HTTP 200 with a message body, which does not pass as data", () => {
    expect(isWbError(error)).toBe(true);
    expect(isWbError(indicators)).toBe(false);
    expect(WbIndicators.safeParse(error).success).toBe(false);
  });
});
