import "server-only";

import { CACHE_POLICY, TWELVEDATA_SCHEDULE, type CachePolicy } from "@/config/cache-policy";
import { MARKET } from "@/config/market-hours";
import { TICKERS } from "@/config/tickers";
import { getEnv } from "@/infra/env";
import type { BudgetResult, CallWithBudget } from "@/infra/outbound/call-with-budget";
import { getCallWithBudget } from "@/infra/outbound/gate";
import { createFinnhubClient, type FinnhubClient } from "@/infra/providers/finnhub.client";
import type { FhBatch } from "@/infra/providers/finnhub.schema";
import { createTwelveDataClient, type TwelveDataClient } from "@/infra/providers/twelvedata.client";
import type { TdQuoteBatch, TdSeriesBatch } from "@/infra/providers/twelvedata.schema";

import { nextMarketOpen, secondsUntilNextMinuteSlot, secondsUntilNextZonedTime } from "./schedule";

export type { BudgetResult };

export interface StocksRepository {
  quotes(): Promise<BudgetResult<TdQuoteBatch>>;
  hourly(): Promise<BudgetResult<TdSeriesBatch>>;
  daily(): Promise<BudgetResult<TdSeriesBatch>>;
  /** Backup quotes (8 symbols + market status = 9 calls). Never called without a key. */
  finnhubQuotes(): Promise<BudgetResult<FhBatch>>;
}

const isOpen = (batch: TdQuoteBatch): boolean =>
  Object.values(batch).some((q) => "is_market_open" in q && q.is_market_open);

const STALE = CACHE_POLICY["twelvedata:quote-closed"].staleFor;
const CLOSED_MAX = CACHE_POLICY["twelvedata:quote-closed"].ttl;

/** Seconds until just after the next open (first data of the session). */
const untilAfterNextOpen = (now: number, afterSec: number): number =>
  Math.ceil((nextMarketOpen(now).getTime() - now) / 1000) + afterSec;

/**
 * TTL from the response's is_market_open (spec §4), aligned to the batch's own minutes so two
 * 8-credit batches never land in the same minute.
 */
export const quotePolicy = (batch: TdQuoteBatch, now: number): CachePolicy => ({
  ttl: isOpen(batch)
    ? secondsUntilNextMinuteSlot(now, TWELVEDATA_SCHEDULE.quoteMinutes)
    : // Closed quotes still refresh at least every 6 h (spec §4 calibration).
      Math.min(CLOSED_MAX, untilAfterNextOpen(now, 60)),
  staleFor: STALE,
});

/**
 * Hourly bars: at :05 while open. While closed no new bar can appear, so the next fetch is
 * just after the first bar of the next session (10:30 New York + 5 min), with no 6 h cap.
 */
export const hourlyPolicy = (open: boolean, now: number): CachePolicy => ({
  ttl: open
    ? secondsUntilNextMinuteSlot(now, TWELVEDATA_SCHEDULE.intradayMinutes)
    : untilAfterNextOpen(now, 65 * 60),
  staleFor: CACHE_POLICY["twelvedata:series-1h"].staleFor,
});

/** Daily bars: once, 15 minutes after the close. */
export const dailyPolicy = (now: number): CachePolicy => ({
  ttl: secondsUntilNextZonedTime(now, TWELVEDATA_SCHEDULE.dailyAfterClose, MARKET.timeZone),
  staleFor: CACHE_POLICY["twelvedata:series-1day"].staleFor,
});

export const createStocksRepository = ({
  callWithBudget,
  twelvedata,
  finnhub = null,
  now = Date.now,
}: {
  callWithBudget: CallWithBudget;
  twelvedata: TwelveDataClient;
  /** null (the default) when FINNHUB_API_KEY is not set. */
  finnhub?: FinnhubClient | null;
  now?: () => number;
}): StocksRepository => {
  // Remember the last known session state so the hourly series can pick its TTL too.
  let lastOpen = false;
  return {
    quotes: async () => {
      const result = await callWithBudget<TdQuoteBatch>({
        budget: "twelvedata",
        endpoint: "/quote",
        cost: TICKERS.length, // 1 credit per symbol
        cacheKey: "twelvedata:quote",
        policy: (batch) => quotePolicy(batch, now()),
        fetcher: (signal) => twelvedata.quotes(TICKERS, signal),
      });
      if (result.status !== "unavailable") lastOpen = isOpen(result.data);
      return result;
    },
    hourly: () =>
      callWithBudget<TdSeriesBatch>({
        budget: "twelvedata",
        endpoint: "/time_series?interval=1h",
        cost: TICKERS.length,
        cacheKey: "twelvedata:series-1h",
        policy: () => hourlyPolicy(lastOpen, now()),
        fetcher: (signal) => twelvedata.series(TICKERS, "1h", 24, signal),
      }),
    daily: () =>
      callWithBudget<TdSeriesBatch>({
        budget: "twelvedata",
        endpoint: "/time_series?interval=1day",
        cost: TICKERS.length,
        cacheKey: "twelvedata:series-1day",
        policy: () => dailyPolicy(now()),
        fetcher: (signal) => twelvedata.series(TICKERS, "1day", 252, signal),
      }),
    finnhubQuotes: async () =>
      finnhub
        ? callWithBudget<FhBatch>({
            budget: "finnhub",
            endpoint: "/quote ×8 + /stock/market-status",
            cost: TICKERS.length + 1,
            // Same key /status reads for this provider's data age (config/providers.ts).
            cacheKey: "finnhub:quote",
            policy: (batch) =>
              CACHE_POLICY[batch.status.isOpen ? "finnhub:quote-open" : "finnhub:quote-closed"],
            fetcher: async (signal) => {
              const [status, ...quotes] = await Promise.all([
                finnhub.marketStatus(signal),
                ...TICKERS.map((t) => finnhub.quote(t, signal)),
              ]);
              return { status, quotes: Object.fromEntries(TICKERS.map((t, i) => [t, quotes[i]])) };
            },
          })
        : { status: "unavailable", reason: "not-configured" },
  };
};

let repository: StocksRepository | undefined;

export const getStocksRepository = (): StocksRepository => {
  if (repository) return repository;
  const env = getEnv();
  // In mock mode MSW answers, so the backup path is exercised without a real key.
  const finnhubKey = env.FINNHUB_API_KEY ?? (env.MOCK_PROVIDERS === "1" ? "mock" : undefined);
  return (repository = createStocksRepository({
    callWithBudget: getCallWithBudget(),
    twelvedata: createTwelveDataClient({ apiKey: env.TWELVEDATA_API_KEY }),
    finnhub: finnhubKey ? createFinnhubClient({ apiKey: finnhubKey }) : null,
  }));
};
