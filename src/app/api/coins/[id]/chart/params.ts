import { z } from "zod";

import {
  CHART_RANGES,
  isWhitelistedCoin,
  type ChartRange,
  type WhitelistedCoin,
} from "@/config/coins";

const CoinId = z.string().regex(/^[a-z0-9-]{1,64}$/);
const Range = z.enum(CHART_RANGES).default("30d");

export type ChartRequest =
  | { ok: true; id: WhitelistedCoin; range: ChartRange }
  | { ok: false; status: 400 | 404; message: string };

/**
 * Whitelist validation before anything touches the cache (spec §11): a random `?range=` or id
 * can never create a new cache key or reach the provider.
 */
export const parseChartRequest = (id: string, range: string | null): ChartRequest => {
  const parsedRange = Range.safeParse(range ?? undefined);
  if (!parsedRange.success) {
    return { ok: false, status: 400, message: `range must be one of ${CHART_RANGES.join(", ")}` };
  }
  if (!CoinId.safeParse(id).success) return { ok: false, status: 400, message: "invalid coin id" };
  if (!isWhitelistedCoin(id)) return { ok: false, status: 404, message: "unknown coin" };
  return { ok: true, id, range: parsedRange.data };
};
