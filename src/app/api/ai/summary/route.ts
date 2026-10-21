import { connection } from "next/server";

import { getAiService } from "@/modules/ai/ai.service";

import { envelopeResponse } from "../../_lib/envelope-response";

/** GET /api/ai/summary → DataEnvelope<MarketBrief> (Groq, regenerated at most every 3 h). */
export async function GET(): Promise<Response> {
  await connection();
  return envelopeResponse(await getAiService().getBrief());
}
