import { describe, expect, it } from "vitest";

import { convert, currencyOptions } from "./fx-convert";

const RATES = {
  base: "USD",
  date: "2026-10-21",
  rates: { IDR: 18_043, EUR: 0.89015, JPY: 152.02 },
};

describe("convert (USD-based cross rates)", () => {
  it("converts from the base", () => {
    expect(convert(1, "USD", "IDR", RATES)).toBe(18_043);
    expect(convert(100, "USD", "EUR", RATES)).toBeCloseTo(89.015, 6);
  });

  it("converts to the base", () => {
    expect(convert(18_043, "IDR", "USD", RATES)).toBeCloseTo(1, 10);
  });

  it("crosses through the base", () => {
    expect(convert(1, "EUR", "IDR", RATES)).toBeCloseTo(18_043 / 0.89015, 6);
  });

  it("same currency is identity; unknown currency or invalid amount is null", () => {
    expect(convert(42, "IDR", "IDR", RATES)).toBe(42);
    expect(convert(1, "XYZ", "IDR", RATES)).toBeNull();
    expect(convert(Number.NaN, "USD", "IDR", RATES)).toBeNull();
  });
});

describe("currencyOptions", () => {
  it("lists the base plus every rate, home currencies first, then alphabetical", () => {
    expect(currencyOptions(RATES)).toEqual(["USD", "IDR", "EUR", "JPY"]);
  });
});
