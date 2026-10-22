import "server-only";

import { FhMarketStatus, FhQuote } from "./finnhub.schema";
import { assertHttps, getJson } from "./http";

export const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

export interface FinnhubClient {
  /** One symbol per call (1 of the 60/min). */
  quote(symbol: string, signal: AbortSignal): Promise<FhQuote>;
  marketStatus(signal: AbortSignal): Promise<FhMarketStatus>;
}

/** Backup stock provider (spec 10.2). The key travels in a header so it never lands in logs. */
export const createFinnhubClient = ({
  apiKey,
  baseUrl = FINNHUB_BASE_URL,
}: {
  apiKey: string;
  baseUrl?: string;
}): FinnhubClient => {
  const base = assertHttps(baseUrl);
  const headers = { "X-Finnhub-Token": apiKey };
  return {
    quote: (symbol, signal) =>
      getJson(`${base}/quote?symbol=${encodeURIComponent(symbol)}`, FhQuote, { signal, headers }),
    marketStatus: (signal) =>
      getJson(`${base}/stock/market-status?exchange=US`, FhMarketStatus, { signal, headers }),
  };
};
