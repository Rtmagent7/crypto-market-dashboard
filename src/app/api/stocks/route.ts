import { connection } from "next/server";

import type { DataEnvelope, StockQuote } from "@/modules/shared/domain";
import { getStocksService } from "@/modules/stocks/stocks.service";

import { envelopeResponse } from "../_lib/envelope-response";

/** GET /api/stocks → DataEnvelope<StockQuote[]> for the 8-ticker watchlist. */
export async function GET(): Promise<Response> {
  await connection();
  const envelope: DataEnvelope<StockQuote[]> = await getStocksService().getQuotes();
  return envelopeResponse(envelope);
}
