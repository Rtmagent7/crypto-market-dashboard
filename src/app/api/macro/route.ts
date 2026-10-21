import { connection } from "next/server";

import { getMacroService } from "@/modules/macro/macro.service";
import type { DataEnvelope, MacroIndicator } from "@/modules/shared/domain";

import { envelopeResponse } from "../_lib/envelope-response";
import { withRateLimit } from "../_lib/with-rate-limit";

/** GET /api/macro → DataEnvelope<MacroIndicator[]> (Indonesia, World Bank, TTL 7 days). */
async function handle(): Promise<Response> {
  await connection();
  const envelope: DataEnvelope<MacroIndicator[]> = await getMacroService().getIndicators();
  return envelopeResponse(envelope);
}

export const GET = withRateLimit("api", handle);
