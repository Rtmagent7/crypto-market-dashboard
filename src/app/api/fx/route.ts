import { connection } from "next/server";

import { getFxService } from "@/modules/fx/fx.service";
import type { DataEnvelope, FxRates } from "@/modules/shared/domain";

import { envelopeResponse } from "../_lib/envelope-response";

/** GET /api/fx → DataEnvelope<FxRates> (USD base; Frankfurter, ExchangeRate-API as backup). */
export async function GET(): Promise<Response> {
  await connection();
  const envelope: DataEnvelope<FxRates> = await getFxService().getRates();
  return envelopeResponse(envelope);
}
