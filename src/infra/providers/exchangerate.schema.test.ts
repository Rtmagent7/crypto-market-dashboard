import { describe, expect, it } from "vitest";

import latest from "../../../tests/fixtures/exchangerate-latest-open.json";

import { ErOpenLatest } from "./exchangerate.schema";

describe("ExchangeRate-API open endpoint schema matches the real fixture", () => {
  it("parses base, update time and rates", () => {
    const parsed = ErOpenLatest.parse(latest);
    expect(parsed.base_code).toBe("USD");
    expect(parsed.rates.IDR).toBeGreaterThan(10_000);
    expect(parsed.time_last_update_unix).toBeGreaterThan(1_700_000_000);
  });

  it("rejects an error payload", () => {
    expect(
      ErOpenLatest.safeParse({ result: "error", "error-type": "unsupported-code" }).success,
    ).toBe(false);
  });
});
