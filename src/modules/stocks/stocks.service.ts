import { TICKERS } from "@/config/tickers";
import type {
  DataEnvelope,
  PricePoint,
  StockQuote,
  StockSeriesRange,
} from "@/modules/shared/domain";
import { toEnvelope } from "@/modules/shared/envelope";
import { withFallback } from "@/modules/shared/fallback";

import { nextMarketOpen } from "./schedule";
import { fromFinnhub, fromTwelveDataQuotes, fromTwelveDataSeries } from "./stocks.mapper";
import { getStocksRepository, type StocksRepository } from "./stocks.repository";

export interface StocksService {
  getQuotes(): Promise<DataEnvelope<StockQuote[]>>;
  getSeries(range: StockSeriesRange): Promise<DataEnvelope<Record<string, PricePoint[]>>>;
  /** Next regular-session open, for the "opens 21:30 WITA" session bar. */
  nextOpen(): Date;
}

/**
 * Twelve Data is the only core stock provider (ADR 0003). Finnhub backs up quotes only (spec
 * 10.2: stock charts have no backup); the envelope's `source` names whoever served.
 */
export const createStocksService = ({
  repository,
  now = Date.now,
}: {
  repository: StocksRepository;
  now?: () => number;
}): StocksService => ({
  nextOpen: () => nextMarketOpen(now()),
  getQuotes: () =>
    withFallback(
      {
        provider: "twelvedata",
        load: repository.quotes,
        map: (batch) => fromTwelveDataQuotes(batch, TICKERS),
      },
      {
        provider: "finnhub",
        load: repository.finnhubQuotes,
        map: (batch) => fromFinnhub(batch, TICKERS),
      },
      now(),
    ),
  getSeries: async (range) =>
    toEnvelope(await (range === "1d" ? repository.hourly() : repository.daily()), {
      source: "twelvedata",
      map: fromTwelveDataSeries,
      now: now(),
    }),
});

let service: StocksService | undefined;

export const getStocksService = (): StocksService =>
  (service ??= createStocksService({ repository: getStocksRepository() }));
