import { describe, expect, it } from "vitest";

import { CACHE_POLICY } from "@/config/cache-policy";
import { silentLogger } from "@/infra/logger";
import { createCallWithBudget } from "@/infra/outbound/call-with-budget";
import { createCoinGeckoClient } from "@/infra/providers/coingecko.client";
import { createMemoryStore } from "@/infra/store";
import { createMarketRepository } from "@/modules/market/market.repository";
import { createMarketService } from "@/modules/market/market.service";

import { setupProviderMocks } from "../msw/server";

const { hits } = setupProviderMocks();

const START = Date.parse("2026-10-21T00:00:00Z");
const perDay = (key: keyof typeof CACHE_POLICY): number => 86_400 / CACHE_POLICY[key].ttl;

describe("quota compliance: market module (service → repository → gate → MSW)", () => {
  it("a visitor every 30 s for 24 h stays within the TTL formula for every CoinGecko endpoint", async () => {
    let clock = START;
    const service = createMarketService({
      repository: createMarketRepository({
        callWithBudget: createCallWithBudget({
          store: createMemoryStore(() => clock),
          logger: silentLogger,
          now: () => clock,
          sleep: async () => undefined,
        }),
        coingecko: createCoinGeckoClient({ apiKey: "test" }),
      }),
      now: () => clock,
    });

    for (let t = START; t < START + 86_400_000; t += 30_000) {
      clock = t;
      const [top, global, trending] = await Promise.all([
        service.getTopCoins(),
        service.getGlobal(),
        service.getTrending(),
      ]);
      expect([top.status, global.status, trending.status]).not.toContain("unavailable");
    }

    expect(hits.get("coingecko:/coins/markets")).toBeLessThanOrEqual(perDay("coingecko:markets"));
    expect(hits.get("coingecko:/global")).toBeLessThanOrEqual(perDay("coingecko:global"));
    expect(hits.get("coingecko:/search/trending")).toBeLessThanOrEqual(
      perDay("coingecko:trending"),
    );
    // 2,880 visits × 3 widgets went out as at most 96 + 24 + 24 provider calls.
  });
});
