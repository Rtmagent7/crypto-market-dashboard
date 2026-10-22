import "server-only";

import { CmcListings } from "./coinmarketcap.schema";
import { assertHttps, getJson } from "./http";

export const COINMARKETCAP_BASE_URL = "https://pro-api.coinmarketcap.com";

export interface CoinMarketCapClient {
  /** Top 50 by market cap in USD: 1 credit (CMC bills per 200 rows). */
  listings(signal: AbortSignal): Promise<CmcListings>;
}

/** Backup crypto provider (spec 10.2). HTTP + Zod only; called from a repository. */
export const createCoinMarketCapClient = ({
  apiKey,
  baseUrl = COINMARKETCAP_BASE_URL,
}: {
  apiKey: string;
  baseUrl?: string;
}): CoinMarketCapClient => {
  const base = assertHttps(baseUrl);
  const headers = { "X-CMC_PRO_API_KEY": apiKey };
  return {
    listings: (signal) =>
      getJson(`${base}/v1/cryptocurrency/listings/latest?limit=50&convert=USD`, CmcListings, {
        signal,
        headers,
      }),
  };
};
