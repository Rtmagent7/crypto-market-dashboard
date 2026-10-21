import { describe, expect, it } from "vitest";

import type { ProviderStatus } from "@/modules/shared/domain";

import { computeStatuses, type RawProviderState } from "./status.logic";

const NOW = Date.parse("2026-10-21T10:00:00Z");

type Partial0 = Omit<RawProviderState, "quotaCap" | "quotaPeriod">;

const CAPS: Record<string, Pick<RawProviderState, "quotaCap" | "quotaPeriod">> = {
  coingecko: { quotaCap: 8_000, quotaPeriod: "month" },
  coinmarketcap: { quotaCap: 8_000, quotaPeriod: "month" },
  twelvedata: { quotaCap: 640, quotaPeriod: "day" },
  finnhub: { quotaCap: 250, quotaPeriod: "day" },
  frankfurter: { quotaCap: 500, quotaPeriod: "day" },
  exchangerate: { quotaCap: 1_200, quotaPeriod: "month" },
  "groq:summary": { quotaCap: 800, quotaPeriod: "day" },
  "workers-ai": { quotaCap: 40, quotaPeriod: "day" },
};

const healthy = (fetchedAgoSec: number | null, used = 10): Partial0 => ({
  quotaUsed: used,
  breakerOpen: false,
  cooldown: false,
  fetchedAt: fetchedAgoSec === null ? null : NOW - fetchedAgoSec * 1000,
  configured: true,
});

const base = (
  overrides: Record<string, Partial<RawProviderState>> = {},
): Record<string, RawProviderState> => {
  const rows: Record<string, Partial0> = {
    coingecko: healthy(60),
    coinmarketcap: { ...healthy(null, 0), configured: false },
    twelvedata: healthy(600),
    finnhub: { ...healthy(null, 0), configured: false },
    frankfurter: healthy(3_600),
    exchangerate: healthy(null, 0),
    "groq:summary": healthy(1_800),
    "workers-ai": { ...healthy(null, 0), configured: false },
  };
  return Object.fromEntries(
    Object.entries(rows).map(([id, r]) => [id, { ...r, ...CAPS[id]!, ...overrides[id] }]),
  );
};

const byId = (rows: ProviderStatus[], id: string): ProviderStatus => rows.find((r) => r.id === id)!;

describe("computeStatuses (spec 10.6)", () => {
  it("reports operational providers with quota against the enforced cap", () => {
    const rows = computeStatuses(base(), { now: NOW });
    expect(byId(rows, "coingecko")).toMatchObject({
      state: "operational",
      quotaUsed: 10,
      quotaCap: 8_000,
      quotaPeriod: "month",
      reason: null,
    });
    expect(byId(rows, "twelvedata")).toMatchObject({ quotaCap: 640, quotaPeriod: "day" });
  });

  it("an open circuit breaker means down", () => {
    const row = byId(
      computeStatuses(base({ coingecko: { breakerOpen: true } }), { now: NOW }),
      "coingecko",
    );
    expect(row.state).toBe("down");
    expect(row.reason).toMatch(/failed repeatedly/i);
  });

  it("degraded at ≥ 80% of the cap, during a 429 cooldown, or when data is far past its TTL", () => {
    const rows = computeStatuses(
      base({
        coingecko: { quotaUsed: 6_400 },
        twelvedata: { cooldown: true },
        frankfurter: { fetchedAt: NOW - 3 * 86_400_000 },
      }),
      { now: NOW },
    );
    expect(byId(rows, "coingecko")).toMatchObject({
      state: "degraded",
      reason: expect.stringMatching(/80%/),
    });
    expect(byId(rows, "twelvedata")).toMatchObject({
      state: "degraded",
      reason: expect.stringMatching(/rate limit/i),
    });
    expect(byId(rows, "frankfurter")).toMatchObject({
      state: "degraded",
      reason: expect.stringMatching(/older/i),
    });
  });

  it("backups without a key, or never needed, are on standby", () => {
    const rows = computeStatuses(base(), { now: NOW });
    expect(byId(rows, "coinmarketcap")).toMatchObject({
      state: "standby",
      reason: expect.stringMatching(/no api key/i),
    });
    expect(byId(rows, "exchangerate")).toMatchObject({
      state: "standby",
      reason: expect.stringMatching(/not needed/i),
    });
  });

  it("a core provider without a key says so without calling itself a backup", () => {
    const row = computeStatuses(base({ coingecko: { configured: false } }), { now: NOW }).find(
      (r) => r.id === "coingecko",
    )!;
    expect(row.state).toBe("standby");
    expect(row.reason).toBe("No API key configured.");
  });

  it("names the backup when it served more recently than the primary", () => {
    const rows = computeStatuses(base({ exchangerate: { fetchedAt: NOW - 60_000 } }), { now: NOW });
    expect(byId(rows, "frankfurter").fallbackActive).toBe("ExchangeRate-API");
    expect(byId(rows, "exchangerate").state).toBe("operational");
    expect(byId(rows, "coingecko").fallbackActive).toBeNull();
  });

  it("reports when a provider last delivered data", () => {
    expect(byId(computeStatuses(base(), { now: NOW }), "coingecko").lastDataAt).toBe(
      new Date(NOW - 60_000).toISOString(),
    );
  });
});
