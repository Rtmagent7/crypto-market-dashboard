import { describe, expect, it } from "vitest";

import { CHART_RANGES, COIN_WHITELIST } from "@/config/coins";
import { silentLogger } from "@/infra/logger";
import { createCallWithBudget } from "@/infra/outbound/call-with-budget";
import { createCoinGeckoClient } from "@/infra/providers/coingecko.client";
import { createMemoryStore } from "@/infra/store";
import { createMarketRepository } from "@/modules/market/market.repository";
import { createMarketService } from "@/modules/market/market.service";

import { setupProviderMocks } from "../msw/server";

const { hits } = setupProviderMocks();
const START = Date.parse("2026-10-21T00:00:00Z");

describe("quota compliance: coin detail charts (spec §4: 10 coins → 50 calls/day)", () => {
  it("every coin × every range requested every 15 minutes for 24 h stays at ≤ 50 chart calls", async () => {
    let clock = START;
    const service = createMarketService({
      repository: createMarketRepository({
        callWithBudget: createCallWithBudget({
          store: createMemoryStore(() => clock),
          logger: silentLogger,
          now: () => clock,
          sleep: async () => undefined,
        }),
        coingecko: createCoinGeckoClient({}),
      }),
      now: () => clock,
    });

    for (let t = START; t < START + 86_400_000; t += 15 * 60_000) {
      clock = t;
      for (const id of COIN_WHITELIST) {
        for (const range of CHART_RANGES) {
          expect((await service.getChart(id, range)).status).not.toBe("unavailable");
        }
      }
    }
    // 30d: 10 coins × 4/day; 1y: 10 coins × 1/day; 1d shares 30d; 7d is free (sparkline).
    expect(hits.get("coingecko:/coins/:id/market_chart")).toBeLessThanOrEqual(50);
  }, 60_000);
});
