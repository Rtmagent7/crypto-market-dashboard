import { connection, type NextRequest } from "next/server";

import { getMarketService } from "@/modules/market/market.service";

import { envelopeResponse } from "../../../_lib/envelope-response";
import { withRateLimit } from "../../../_lib/with-rate-limit";

import { parseChartRequest } from "./params";

/** GET /api/coins/{id}/chart?range=1d|7d|30d|1y → DataEnvelope<PricePoint[]> */
async function handle(
  request: NextRequest,
  { params }: RouteContext<"/api/coins/[id]/chart">,
): Promise<Response> {
  await connection();
  const parsed = parseChartRequest((await params).id, request.nextUrl.searchParams.get("range"));
  if (!parsed.ok) {
    return Response.json(
      { error: parsed.message },
      { status: parsed.status, headers: { "cache-control": "no-store" } },
    );
  }
  return envelopeResponse(await getMarketService().getChart(parsed.id, parsed.range));
}

export const GET = withRateLimit("api", handle);
