import { connection } from "next/server";

import { getStatusService } from "@/modules/status/status.service";

import { envelopeResponse } from "../_lib/envelope-response";
import { withRateLimit } from "../_lib/with-rate-limit";

/** GET /api/status → DataEnvelope<ProviderStatus[]>, never cached (spec §3: dynamic, no-store). */
async function handle(): Promise<Response> {
  await connection();
  return envelopeResponse(await getStatusService().getStatus(), Date.now(), { noStore: true });
}

export const GET = withRateLimit("api", handle);
