import { describe, expect, it } from "vitest";

import { toEnvelope } from "./envelope";

const NOW = Date.parse("2026-10-21T10:00:00Z");
const iso = (ms: number): string => new Date(ms).toISOString();

describe("toEnvelope", () => {
  it("fresh: nextRefreshAt is when the cached data expires", () => {
    const env = toEnvelope(
      {
        status: "fresh",
        data: [1],
        fetchedAt: NOW - 60_000,
        expiresAt: NOW + 840_000,
        cacheHit: true,
      },
      { source: "coingecko", map: (d: number[]) => d.map((n) => n * 2), now: NOW },
    );
    expect(env).toEqual({
      data: [2],
      status: "fresh",
      source: "coingecko",
      fetchedAt: iso(NOW - 60_000),
      nextRefreshAt: iso(NOW + 840_000),
    });
  });

  it("stale: keeps the old data and its real age, retries soon", () => {
    const env = toEnvelope(
      {
        status: "stale",
        data: [1],
        fetchedAt: NOW - 3_600_000,
        expiresAt: NOW - 2_700_000,
        reason: "budget-exhausted",
      },
      { source: "coingecko", map: (d: number[]) => d, now: NOW },
    );
    expect(env.status).toBe("stale");
    expect(env.data).toEqual([1]);
    expect(env.fetchedAt).toBe(iso(NOW - 3_600_000));
    expect(Date.parse(env.nextRefreshAt)).toBeGreaterThan(NOW);
  });

  it("unavailable: null data, never a fake timestamp in the past", () => {
    const env = toEnvelope(
      { status: "unavailable", reason: "provider-error" },
      { source: "coingecko", map: (d: number[]) => d, now: NOW },
    );
    expect(env).toMatchObject({ data: null, status: "unavailable", fetchedAt: iso(NOW) });
    expect(Date.parse(env.nextRefreshAt)).toBeGreaterThan(NOW);
  });
});
