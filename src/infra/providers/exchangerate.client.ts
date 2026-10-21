import "server-only";

import { ErOpenLatest } from "./exchangerate.schema";
import { assertHttps, getJson } from "./http";

/** Open-access endpoint: no key, updates once a day, ~1.5k requests/month (backup only). */
export const EXCHANGERATE_OPEN_BASE_URL = "https://open.er-api.com/v6";

export interface ExchangeRateClient {
  latest(base: string, signal: AbortSignal): Promise<ErOpenLatest>;
}

export const createExchangeRateClient = ({
  baseUrl = EXCHANGERATE_OPEN_BASE_URL,
}: { baseUrl?: string } = {}): ExchangeRateClient => {
  const base = assertHttps(baseUrl);
  return {
    latest: (currency, signal) =>
      getJson(`${base}/latest/${encodeURIComponent(currency)}`, ErOpenLatest, { signal }),
  };
};
