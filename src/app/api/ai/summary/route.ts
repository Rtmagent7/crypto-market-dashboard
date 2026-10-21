import { connection } from "next/server";

import { getAiService } from "@/modules/ai/ai.service";

import { envelopeResponse } from "../../_lib/envelope-response";
import { withRateLimit } from "../../_lib/with-rate-limit";

/** GET /api/ai/summary → DataEnvelope<MarketBrief> (Groq, regenerated at most every 3 h). */
async function handle(): Promise<Response> {
  await connection();
  return envelopeResponse(await getAiService().getBrief());
}

export const GET = withRateLimit("ai", handle);
