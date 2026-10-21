import { connection } from "next/server";

import { getStatusService } from "@/modules/status/status.service";

import { envelopeResponse } from "../_lib/envelope-response";

/** GET /api/status → DataEnvelope<ProviderStatus[]>, never cached (spec §3: dynamic, no-store). */
export async function GET(): Promise<Response> {
  await connection();
  return envelopeResponse(await getStatusService().getStatus(), Date.now(), { noStore: true });
}
