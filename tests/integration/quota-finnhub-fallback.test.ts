import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { BUDGETS } from "@/infra/outbound/budgets";
import { silentLogger } from "@/infra/logger";
import { createCallWithBudget } from "@/infra/outbound/call-with-budget";
import { createFinnhubClient } from "@/infra/providers/finnhub.client";
import { createTwelveDataClient } from "@/infra/providers/twelvedata.client";
import { createMemoryStore } from "@/infra/store";
import { createStocksRepository } from "@/modules/stocks/stocks.repository";
import { createStocksService } from "@/modules/stocks/stocks.service";

import status from "../fixtures/finnhub-market-status.json";
import { setupProviderMocks } from "../msw/server";

const { hits, server } = setupProviderMocks();
const DAY_MS = 86_400_000;
/** Wednesday 00:00 New York (04:00 UTC); the regular session is 13:30–20:00 UTC. */
const START = Date.parse("2026-10-21T04:00:00Z");

const harness = (): {
  service: ReturnType<typeof createStocksService>;
  at: (t: number) => void;
} => {
  let clock = START;
  const now = (): number => clock;
  const service = createStocksService({
    repository: createStocksRepository({
      callWithBudget: createCallWithBudget({
        store: createMemoryStore(now),
        logger: silentLogger,
        now,
        sleep: async () => undefined,
      }),
      twelvedata: createTwelveDataClient({ apiKey: "test" }),
      finnhub: createFinnhubClient({ apiKey: "test" }),
      now,
    }),
    now,
  });
  // One handler for the whole run: the session flag follows the simulated clock.
  server.use(
    http.get("https://finnhub.io/api/v1/stock/market-status", () => {
      hits.set("finnhub:/stock/market-status", (hits.get("finnhub:/stock/market-status") ?? 0) + 1);
      const sinceMidnight = (clock - START) % DAY_MS;
      const isOpen = sinceMidnight >= 9.5 * 3_600_000 && sinceMidnight < 16 * 3_600_000;
      return HttpResponse.json({ ...status, isOpen });
    }),
  );
  return { service, at: (t) => (clock = t) };
};

const finnhubCalls = (): number =>
  (hits.get("finnhub:/quote") ?? 0) + (hits.get("finnhub:/stock/market-status") ?? 0);

describe("quota compliance: Finnhub fallback (cap 250/day)", () => {
  it("costs nothing while Twelve Data is healthy", async () => {
    const { service, at } = harness();
    for (let t = START; t < START + DAY_MS; t += 5 * 60_000) {
      at(t);
      await service.getQuotes();
    }
    expect(finnhubCalls()).toBe(0);
  });

  it("a full day of Twelve Data outage: quotes keep coming from Finnhub inside its daily cap", async () => {
    server.use(
      http.get("https://api.twelvedata.com/quote", () => HttpResponse.json({}, { status: 503 })),
    );
    const { service, at } = harness();
    for (let t = START; t < START + DAY_MS; t += 60_000) {
      at(t);
      const env = await service.getQuotes();
      expect(env.status).not.toBe("unavailable");
      expect(env.source).toBe("finnhub");
    }
    // 6.5 h open at 20 min + closed hours at 6 h ≈ 24 refreshes × 9 calls.
    expect(finnhubCalls()).toBeLessThanOrEqual(BUDGETS.finnhub.cap);
    expect(hits.get("finnhub:/quote")).toBe(8 * (hits.get("finnhub:/stock/market-status") ?? 0));
  });
});
