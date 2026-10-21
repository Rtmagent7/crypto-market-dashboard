import { describe, expect, it } from "vitest";

import { railFraction, relativeAge } from "./freshness";

const T = Date.parse("2026-10-21T10:00:00Z");

describe("railFraction (spec 9A Freshness Rail)", () => {
  it("is the share of the TTL still remaining", () => {
    expect(railFraction({ fetchedAt: T, nextRefreshAt: T + 900_000, now: T })).toBe(1);
    expect(railFraction({ fetchedAt: T, nextRefreshAt: T + 900_000, now: T + 450_000 })).toBe(0.5);
  });

  it("clamps to [0, 1]", () => {
    expect(railFraction({ fetchedAt: T, nextRefreshAt: T + 900_000, now: T + 2_000_000 })).toBe(0);
    expect(railFraction({ fetchedAt: T, nextRefreshAt: T + 900_000, now: T - 10 })).toBe(1);
    expect(railFraction({ fetchedAt: T, nextRefreshAt: T, now: T })).toBe(0);
  });
});

describe("relativeAge", () => {
  it("reads like copy, not like a TTL", () => {
    expect(relativeAge(T - 20_000, T)).toBe("just now");
    expect(relativeAge(T - 3 * 60_000, T)).toBe("3 min ago");
    expect(relativeAge(T - 2 * 3_600_000, T)).toBe("2 h ago");
    expect(relativeAge(T - 3 * 86_400_000, T)).toBe("3 days ago");
  });
});
