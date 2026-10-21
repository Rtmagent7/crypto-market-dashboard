import { describe, expect, it } from "vitest";

import { parseChartRequest } from "./params";

describe("parseChartRequest — whitelist validation (spec §11: cache-key explosion)", () => {
  it("accepts a whitelisted coin and a known range", () => {
    expect(parseChartRequest("bitcoin", "30d")).toEqual({ ok: true, id: "bitcoin", range: "30d" });
  });

  it("defaults the range to 30d", () => {
    expect(parseChartRequest("ethereum", null)).toEqual({ ok: true, id: "ethereum", range: "30d" });
  });

  it("rejects an unknown range with 400", () => {
    expect(parseChartRequest("bitcoin", "5y")).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects a malformed id with 400 and a well-formed unknown coin with 404", () => {
    expect(parseChartRequest("../../etc", "30d")).toMatchObject({ ok: false, status: 400 });
    expect(parseChartRequest("dogecoin", "30d")).toMatchObject({ ok: false, status: 404 });
  });
});
