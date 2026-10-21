import { describe, expect, it, vi } from "vitest";

import { CgGlobal, CgMarkets, CgTrending } from "@/infra/providers/coingecko.schema";

import global from "../../../tests/fixtures/coingecko-global.json";
import markets from "../../../tests/fixtures/coingecko-markets.json";
import trending from "../../../tests/fixtures/coingecko-trending.json";

import type { BudgetResult, MarketRepository } from "./market.repository";
import { createMarketService } from "./market.service";

const NOW = Date.parse("2026-10-21T10:00:00Z");
const fresh = <T>(data: T): BudgetResult<T> => ({
  status: "fresh",
  data,
  fetchedAt: NOW,
  expiresAt: NOW + 900_000,
  cacheHit: false,
});

const fakeRepository = (overrides: Partial<MarketRepository> = {}): MarketRepository => ({
  coingeckoTop50: vi.fn(async () => fresh(CgMarkets.parse(markets))),
  coingeckoGlobal: vi.fn(async () => fresh(CgGlobal.parse(global))),
  coingeckoTrending: vi.fn(async () => fresh(CgTrending.parse(trending))),
  ...overrides,
});

describe("market service", () => {
  it("returns the top 50 as a fresh DataEnvelope sourced from CoinGecko", async () => {
    const service = createMarketService({ repository: fakeRepository(), now: () => NOW });
    const env = await service.getTopCoins();
    expect(env.status).toBe("fresh");
    expect(env.source).toBe("coingecko");
    expect(env.data).toHaveLength(50);
    expect(env.data?.[0]).toMatchObject({ rank: 1, symbol: expect.stringMatching(/^[A-Z]/) });
    expect(env.nextRefreshAt).toBe(new Date(NOW + 900_000).toISOString());
  });

  it("passes stale data through with its stale status", async () => {
    const repository = fakeRepository({
      coingeckoTop50: vi.fn(async () => ({
        status: "stale" as const,
        data: CgMarkets.parse(markets),
        fetchedAt: NOW - 7_200_000,
        expiresAt: NOW - 6_300_000,
        reason: "provider-error" as const,
      })),
    });
    const env = await createMarketService({ repository, now: () => NOW }).getTopCoins();
    expect(env.status).toBe("stale");
    expect(env.data).toHaveLength(50);
  });

  it("reports unavailable with null data when there is no cache at all", async () => {
    const repository = fakeRepository({
      coingeckoTop50: vi.fn(async () => ({
        status: "unavailable" as const,
        reason: "budget-exhausted" as const,
      })),
    });
    const env = await createMarketService({ repository, now: () => NOW }).getTopCoins();
    expect(env).toMatchObject({ status: "unavailable", data: null });
  });

  it("maps global market data and trending coins", async () => {
    const service = createMarketService({ repository: fakeRepository(), now: () => NOW });
    const [g, t] = await Promise.all([service.getGlobal(), service.getTrending()]);
    expect(g.data?.totalMarketCapUsd).toBeGreaterThan(1e12);
    expect(t.data?.length).toBeLessThanOrEqual(5);
  });
});
