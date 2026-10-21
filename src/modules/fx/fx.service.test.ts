import { describe, expect, it, vi } from "vitest";

import { ErOpenLatest } from "@/infra/providers/exchangerate.schema";
import { FfLatest, FfRange } from "@/infra/providers/frankfurter.schema";

import erLatest from "../../../tests/fixtures/exchangerate-latest-open.json";
import ffLatest from "../../../tests/fixtures/frankfurter-latest.json";
import ffRange from "../../../tests/fixtures/frankfurter-range-1y.json";

import type { BudgetResult, FxRepository } from "./fx.repository";
import { createFxService } from "./fx.service";

const NOW = Date.parse("2026-10-21T10:00:00Z");
const fresh = <T>(data: T): BudgetResult<T> => ({
  status: "fresh",
  data,
  fetchedAt: NOW,
  expiresAt: NOW + 3_600_000,
  cacheHit: false,
});
const stale = <T>(data: T): BudgetResult<T> => ({
  status: "stale",
  data,
  fetchedAt: NOW - 86_400_000,
  expiresAt: NOW - 60_000,
  reason: "provider-error",
});
const unavailable = { status: "unavailable", reason: "provider-error" } as const;

const repo = (overrides: Partial<FxRepository> = {}): FxRepository => ({
  frankfurterLatest: vi.fn(async () => fresh(FfLatest.parse(ffLatest))),
  frankfurterRange: vi.fn(async () => fresh(FfRange.parse(ffRange))),
  exchangerateLatest: vi.fn(async () => fresh(ErOpenLatest.parse(erLatest))),
  ...overrides,
});

describe("fx service — fallback chain (spec 10.2): Frankfurter → ExchangeRate-API → stale", () => {
  it("uses Frankfurter when it is fresh and never touches the backup", async () => {
    const repository = repo();
    const env = await createFxService({ repository, now: () => NOW }).getRates();
    expect(env).toMatchObject({ status: "fresh", source: "frankfurter" });
    expect(repository.exchangerateLatest).not.toHaveBeenCalled();
  });

  it("switches to ExchangeRate-API when Frankfurter has nothing, and says so", async () => {
    const env = await createFxService({
      repository: repo({ frankfurterLatest: vi.fn(async () => unavailable) }),
      now: () => NOW,
    }).getRates();
    expect(env).toMatchObject({ status: "fresh", source: "exchangerate" });
    expect(env.data?.rates.IDR).toBeGreaterThan(10_000);
  });

  it("prefers fresh backup data over stale primary data", async () => {
    const env = await createFxService({
      repository: repo({ frankfurterLatest: vi.fn(async () => stale(FfLatest.parse(ffLatest))) }),
      now: () => NOW,
    }).getRates();
    expect(env.source).toBe("exchangerate");
    expect(env.status).toBe("fresh");
  });

  it("falls back to stale primary data when the backup is also down", async () => {
    const env = await createFxService({
      repository: repo({
        frankfurterLatest: vi.fn(async () => stale(FfLatest.parse(ffLatest))),
        exchangerateLatest: vi.fn(async () => unavailable),
      }),
      now: () => NOW,
    }).getRates();
    expect(env).toMatchObject({ status: "stale", source: "frankfurter" });
  });

  it("is unavailable only when both have nothing", async () => {
    const env = await createFxService({
      repository: repo({
        frankfurterLatest: vi.fn(async () => unavailable),
        exchangerateLatest: vi.fn(async () => unavailable),
      }),
      now: () => NOW,
    }).getRates();
    expect(env).toMatchObject({ status: "unavailable", data: null });
  });
});

describe("fx service — USD/IDR", () => {
  it("returns the rate with its change against the previous business day", async () => {
    const env = await createFxService({ repository: repo(), now: () => NOW }).getUsdIdr();
    expect(env.status).toBe("fresh");
    expect(env.data?.rate).toBeGreaterThan(10_000);
    expect(env.data?.change1dPct).toEqual(expect.any(Number));
    expect(env.data?.history.length).toBeGreaterThan(240);
  });

  it("still shows the rate when the history is unavailable", async () => {
    const env = await createFxService({
      repository: repo({ frankfurterRange: vi.fn(async () => unavailable) }),
      now: () => NOW,
    }).getUsdIdr();
    expect(env.data?.rate).toBeGreaterThan(10_000);
    expect(env.data?.change1dPct).toBeNull();
    expect(env.data?.history).toEqual([]);
  });
});
