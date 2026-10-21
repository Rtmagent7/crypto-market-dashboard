import "server-only";

import { FfLatest, FfRange } from "./frankfurter.schema";
import { assertHttps, getJson } from "./http";

// api.frankfurter.app now 301-redirects here; call the canonical host directly.
export const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v1";

export interface FrankfurterClient {
  latest(base: string, signal: AbortSignal): Promise<FfLatest>;
  range(
    base: string,
    from: string,
    symbols: readonly string[],
    signal: AbortSignal,
  ): Promise<FfRange>;
}

/** Keyless provider; still budgeted (500/day) so a bug can never hammer it. */
export const createFrankfurterClient = ({
  baseUrl = FRANKFURTER_BASE_URL,
}: { baseUrl?: string } = {}): FrankfurterClient => {
  const base = assertHttps(baseUrl);
  return {
    latest: (currency, signal) =>
      getJson(`${base}/latest?from=${encodeURIComponent(currency)}`, FfLatest, { signal }),
    range: (currency, from, symbols, signal) =>
      getJson(
        `${base}/${encodeURIComponent(from)}..?from=${encodeURIComponent(currency)}&to=${symbols.map(encodeURIComponent).join(",")}`,
        FfRange,
        { signal },
      ),
  };
};
