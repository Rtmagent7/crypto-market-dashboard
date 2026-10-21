import "server-only";

import { ProviderHttpError } from "@/infra/outbound/errors";

import { assertHttps, getJson } from "./http";
import { WbIndicators, isWbError } from "./worldbank.schema";

export const WORLDBANK_BASE_URL = "https://api.worldbank.org/v2";

export interface WorldBankClient {
  indicators(
    countryIso3: string,
    ids: readonly string[],
    years: { from: number; to: number },
    signal: AbortSignal,
  ): Promise<WbIndicators>;
}

// The API reports bad parameters as HTTP 200 + a message body; treat it as a 4xx (no retry).
const rejectBody = (body: unknown): ProviderHttpError | null =>
  isWbError(body) ? new ProviderHttpError(400) : null;

/** Keyless provider; still budgeted so a bug can never hammer it. */
export const createWorldBankClient = ({
  baseUrl = WORLDBANK_BASE_URL,
}: { baseUrl?: string } = {}): WorldBankClient => {
  const base = assertHttps(baseUrl);
  return {
    // source=2 (World Development Indicators) is required to ask for several indicators at once.
    indicators: (country, ids, { from, to }, signal) =>
      getJson(
        `${base}/country/${encodeURIComponent(country)}/indicator/${ids.map(encodeURIComponent).join(";")}?source=2&format=json&date=${from}:${to}&per_page=500`,
        WbIndicators,
        { signal, rejectBody },
      ),
  };
};
