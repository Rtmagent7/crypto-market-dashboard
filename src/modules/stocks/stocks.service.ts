import { TICKERS } from "@/config/tickers";
import type {
  DataEnvelope,
  PricePoint,
  StockQuote,
  StockSeriesRange,
} from "@/modules/shared/domain";
import { toEnvelope } from "@/modules/shared/envelope";

import { nextMarketOpen } from "./schedule";
import { fromTwelveDataQuotes, fromTwelveDataSeries } from "./stocks.mapper";
import { getStocksRepository, type StocksRepository } from "./stocks.repository";

export interface StocksService {
  getQuotes(): Promise<DataEnvelope<StockQuote[]>>;
  getSeries(range: StockSeriesRange): Promise<DataEnvelope<Record<string, PricePoint[]>>>;
  /** Next regular-session open, for the "opens 21:30 WITA" session bar. */
  nextOpen(): Date;
}

/**
 * Twelve Data is the only core stock provider (ADR 0003). Finnhub joins as the backup once a key
 * and a real fixture exist (rule: never invent response shapes).
 */
export const createStocksService = ({
  repository,
  now = Date.now,
}: {
  repository: StocksRepository;
  now?: () => number;
}): StocksService => ({
  nextOpen: () => nextMarketOpen(now()),
  getQuotes: async () =>
    toEnvelope(await repository.quotes(), {
      source: "twelvedata",
      map: (batch) => fromTwelveDataQuotes(batch, TICKERS),
      now: now(),
    }),
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
