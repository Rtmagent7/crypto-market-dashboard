import { connection } from "next/server";

import { createMarketService } from "@/modules/market/market.service";
import { getMarketRepository } from "@/modules/market/market.repository";
import type { CryptoAsset, DataEnvelope } from "@/modules/shared/domain";

import { envelopeResponse } from "../_lib/envelope-response";

/** GET /api/market → DataEnvelope<CryptoAsset[]> (top 50 by market cap, 7-day sparkline). */
export async function GET(): Promise<Response> {
  // Request-time only: with Cache Components a GET handler would otherwise be prerendered,
  // which would call the provider at build time.
  await connection();
  const envelope: DataEnvelope<CryptoAsset[]> = await createMarketService({
    repository: getMarketRepository(),
  }).getTopCoins();
  return envelopeResponse(envelope);
}
