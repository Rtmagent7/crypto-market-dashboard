import type {
  TdQuote,
  TdQuoteBatch,
  TdSeries,
  TdSeriesBatch,
} from "@/infra/providers/twelvedata.schema";
import type { PricePoint, StockQuote } from "@/modules/shared/domain";

import { zonedLocalToUtc } from "./schedule";

const isQuote = (v: TdQuoteBatch[string]): v is TdQuote => "close" in v;
const isSeries = (v: TdSeriesBatch[string]): v is TdSeries => "values" in v;

/** Twelve Data batch → StockQuote[] in watchlist order; failed symbols are left out. */
export const fromTwelveDataQuotes = (batch: TdQuoteBatch, order: readonly string[]): StockQuote[] =>
  order.flatMap((symbol) => {
    const q = batch[symbol];
    if (!q || !isQuote(q)) return [];
    return [
      {
        symbol: q.symbol,
        name: q.name,
        price: q.close,
        change: q.change,
        changePct: q.percent_change,
        isMarketOpen: q.is_market_open,
        asOf: new Date((q.last_quote_at ?? q.timestamp) * 1000).toISOString(),
      },
    ];
  });

/**
 * Series per ticker, oldest first. Intraday bars are exchange-local ("2026-10-21 11:30:00",
 * America/New_York) and become UTC instants; daily bars stay business days.
 */
export const fromTwelveDataSeries = (batch: TdSeriesBatch): Record<string, PricePoint[]> =>
  Object.fromEntries(
    Object.entries(batch).flatMap(([symbol, s]) => {
      if (!isSeries(s)) return [];
      const points = s.values
        .map((v) => ({
          t:
            v.datetime.length > 10
              ? zonedLocalToUtc(v.datetime, s.meta.exchange_timezone)
              : v.datetime,
          v: v.close,
        }))
        .reverse();
      return [[symbol, points]];
    }),
  );
