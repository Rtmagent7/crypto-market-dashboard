import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { silentLogger } from "@/infra/logger";
import { createCallWithBudget } from "@/infra/outbound/call-with-budget";
import { createTwelveDataClient } from "@/infra/providers/twelvedata.client";
import { createMemoryStore } from "@/infra/store";
import { createStocksRepository } from "@/modules/stocks/stocks.repository";
import { createStocksService } from "@/modules/stocks/stocks.service";

import quote from "../fixtures/twelvedata-quote.json";
import daily from "../fixtures/twelvedata-time-series-1day.json";
import hourly from "../fixtures/twelvedata-time-series-1h.json";
import { setupProviderMocks } from "../msw/server";

const { server } = setupProviderMocks();

const DAY_MS = 86_400_000;
/** Wednesday 2026-10-21 00:00 New York (04:00 UTC); the session is 13:30–20:00 UTC daily. */
const START = Date.parse("2026-10-21T04:00:00Z");
const SESSION_OPEN_MS = 9.5 * 3_600_000; // 13:30 UTC is 9.5 h after 04:00 UTC
const SESSION_CLOSE_MS = 16 * 3_600_000; // 20:00 UTC
const CREDITS_PER_BATCH = 8;

describe("quota compliance: Twelve Data (spec §4: ≤ 256 credits/day, ≤ 8 credits/minute)", () => {
  it("a visitor every minute loading quotes + hourly + daily stays within both limits", async () => {
    let clock = START;
    const creditsByMinute = new Map<string, number>();
    const batches = new Map<string, number>();
    const spend = (kind: string): void => {
      batches.set(kind, (batches.get(kind) ?? 0) + 1);
      const minute = new Date(clock).toISOString().slice(0, 16);
      creditsByMinute.set(minute, (creditsByMinute.get(minute) ?? 0) + CREDITS_PER_BATCH);
    };
    const marketOpen = (): boolean => {
      const sinceMidnight = (clock - START) % DAY_MS;
      return sinceMidnight >= SESSION_OPEN_MS && sinceMidnight < SESSION_CLOSE_MS;
    };

    server.use(
      http.get("https://api.twelvedata.com/quote", () => {
        spend("quote");
        const open = marketOpen();
        return HttpResponse.json(
          Object.fromEntries(
            Object.entries(quote).map(([k, v]) => [k, { ...v, is_market_open: open }]),
          ),
        );
      }),
      http.get("https://api.twelvedata.com/time_series", ({ request }) => {
        const interval = new URL(request.url).searchParams.get("interval") ?? "?";
        spend(interval);
        return HttpResponse.json(interval === "1day" ? daily : hourly);
      }),
    );

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
        now,
      }),
      now,
    });

    const visitEveryMinuteFor24h = async (from: number): Promise<void> => {
      for (let t = from; t < from + DAY_MS; t += 60_000) {
        clock = t;
        const [quotes] = await Promise.all([
          service.getQuotes(),
          service.getSeries("1d"),
          service.getSeries("1y"),
        ]);
        expect(quotes.status).not.toBe("unavailable");
      }
    };

    // Day 1 starts with an empty cache (one-off first fetches); day 2 is the steady state the
    // calibration table describes.
    await visitEveryMinuteFor24h(START);
    const day1 = JSON.stringify(Object.fromEntries(batches));
    creditsByMinute.clear();
    batches.clear();
    await visitEveryMinuteFor24h(START + DAY_MS);
    const day2 = JSON.stringify(Object.fromEntries(batches));

    const total = [...creditsByMinute.values()].reduce((a, b) => a + b, 0);
    expect(total, `batches — day 1 ${day1}, day 2 ${day2}`).toBeLessThanOrEqual(256);
    expect(Math.max(...creditsByMinute.values())).toBeLessThanOrEqual(8);
  }, 120_000);
});
