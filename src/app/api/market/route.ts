import { connection } from "next/server";

import { getMarketService } from "@/modules/market/market.service";
import type { CryptoAsset, DataEnvelope } from "@/modules/shared/domain";

import { envelopeResponse } from "../_lib/envelope-response";
import { withRateLimit } from "../_lib/with-rate-limit";

/** GET /api/market → DataEnvelope<CryptoAsset[]> (top 50 by market cap, 7-day sparkline). */
async function handle(): Promise<Response> {
  // Request-time only: with Cache Components a GET handler would otherwise be prerendered,
  // which would call the provider at build time.
  await connection();
  const envelope: DataEnvelope<CryptoAsset[]> = await getMarketService().getTopCoins();
  return envelopeResponse(envelope);
}

export const GET = withRateLimit("api", handle);
