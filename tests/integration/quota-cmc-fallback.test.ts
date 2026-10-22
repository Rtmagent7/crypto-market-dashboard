import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { CACHE_POLICY } from "@/config/cache-policy";
import { silentLogger } from "@/infra/logger";
import { createCallWithBudget } from "@/infra/outbound/call-with-budget";
import { createCoinGeckoClient } from "@/infra/providers/coingecko.client";
import { createCoinMarketCapClient } from "@/infra/providers/coinmarketcap.client";
import { createMemoryStore } from "@/infra/store";
import { createMarketRepository } from "@/modules/market/market.repository";
import { createMarketService } from "@/modules/market/market.service";

import { setupProviderMocks } from "../msw/server";

const { hits, server } = setupProviderMocks();
const START = Date.parse("2026-10-22T00:00:00Z");
const DAY = 86_400_000;

const harness = (): {
  service: ReturnType<typeof createMarketService>;
  at: (t: number) => void;
} => {
  let clock = START;
  const now = (): number => clock;
  const service = createMarketService({
    repository: createMarketRepository({
      callWithBudget: createCallWithBudget({
        store: createMemoryStore(now),
        logger: silentLogger,
        now,
        sleep: async () => undefined,
      }),
      coingecko: createCoinGeckoClient({ apiKey: "test" }),
      coinmarketcap: createCoinMarketCapClient({ apiKey: "test" }),
    }),
    now,
  });
  return { service, at: (t) => (clock = t) };
};

describe("quota compliance: CoinMarketCap fallback", () => {
  it("costs nothing while CoinGecko is healthy", async () => {
    const { service, at } = harness();
    for (let t = START; t < START + DAY; t += 60_000) {
      at(t);
      await service.getTopCoins();
    }
    expect(hits.get("coinmarketcap:/listings/latest") ?? 0).toBe(0);
  });

  it("a full day of CoinGecko outage is served by CMC within its own 15 min TTL", async () => {
    server.use(
      http.get("https://api.coingecko.com/api/v3/coins/markets", () =>
        HttpResponse.json({}, { status: 503 }),
      ),
    );
    const { service, at } = harness();
    for (let t = START; t < START + DAY; t += 60_000) {
      at(t);
      const env = await service.getTopCoins();
      expect(env.status).toBe("fresh");
      expect(env.source).toBe("coinmarketcap");
    }
    expect(hits.get("coinmarketcap:/listings/latest")).toBeLessThanOrEqual(
      86_400 / CACHE_POLICY["coinmarketcap:listings"].ttl,
    );
  });
});
