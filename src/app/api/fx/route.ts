import { connection } from "next/server";

import { getFxService } from "@/modules/fx/fx.service";
import type { DataEnvelope, FxRates } from "@/modules/shared/domain";

import { envelopeResponse } from "../_lib/envelope-response";
import { withRateLimit } from "../_lib/with-rate-limit";

/** GET /api/fx → DataEnvelope<FxRates> (USD base; Frankfurter, ExchangeRate-API as backup). */
async function handle(): Promise<Response> {
  await connection();
  const envelope: DataEnvelope<FxRates> = await getFxService().getRates();
  return envelopeResponse(envelope);
}

export const GET = withRateLimit("api", handle);
