import "server-only";

import { ProviderHttpError } from "@/infra/outbound/errors";

import { assertHttps, getJson } from "./http";
import { TdQuoteBatch, TdSeriesBatch } from "./twelvedata.schema";

export const TWELVEDATA_BASE_URL = "https://api.twelvedata.com";

export type SeriesInterval = "1h" | "1day";

export interface TwelveDataClient {
  quotes(symbols: readonly string[], signal: AbortSignal): Promise<TdQuoteBatch>;
  series(
    symbols: readonly string[],
    interval: SeriesInterval,
    outputsize: number,
    signal: AbortSignal,
  ): Promise<TdSeriesBatch>;
}

/** Twelve Data answers some errors (credits exhausted, bad key) with HTTP 200 and this body. */
const rejectBody = (body: unknown): ProviderHttpError | null => {
  if (
    typeof body === "object" &&
    body !== null &&
    (body as { status?: unknown }).status === "error"
  ) {
    const code = Number((body as { code?: unknown }).code);
    return new ProviderHttpError(Number.isFinite(code) ? code : 502);
  }
  return null;
};

/** HTTP + Zod only. One batch = 1 credit per symbol, so 8 tickers spend a whole minute's 8. */
export const createTwelveDataClient = ({
  apiKey,
  baseUrl = TWELVEDATA_BASE_URL,
}: {
  apiKey?: string;
  baseUrl?: string;
}): TwelveDataClient => {
  const base = assertHttps(baseUrl);
  // Header auth keeps the key out of URLs, logs and error messages.
  const headers: Record<string, string> = apiKey ? { authorization: `apikey ${apiKey}` } : {};
  const list = (symbols: readonly string[]): string => symbols.map(encodeURIComponent).join(",");
  return {
    quotes: (symbols, signal) =>
      getJson(`${base}/quote?symbol=${list(symbols)}`, TdQuoteBatch, {
        signal,
        headers,
        rejectBody,
      }),
    series: (symbols, interval, outputsize, signal) =>
      getJson(
        `${base}/time_series?symbol=${list(symbols)}&interval=${interval}&outputsize=${outputsize}`,
        TdSeriesBatch,
        { signal, headers, rejectBody },
      ),
  };
};
