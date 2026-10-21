import { connection, type NextRequest } from "next/server";

import { getEnv } from "@/infra/env";
import { getAiService } from "@/modules/ai/ai.service";
import { getFxService } from "@/modules/fx/fx.service";
import { getMacroService } from "@/modules/macro/macro.service";
import { getMarketService } from "@/modules/market/market.service";
import type { DataEnvelope, DataStatus } from "@/modules/shared/domain";
import { getStocksService } from "@/modules/stocks/stocks.service";

import { WARM_SCOPES, authorizeCron, parseScope, type WarmScope } from "./auth";

type WarmReport = { scope: WarmScope; results: Record<string, DataStatus> };

const statusOf = async (p: Promise<DataEnvelope<unknown>>): Promise<DataStatus> => (await p).status;

/** Each scope refreshes through the normal services → callWithBudget, so cron can never exceed a cap. */
const WARMERS: Record<WarmScope, () => Record<string, Promise<DataStatus>>> = {
  market: () => {
    const m = getMarketService();
    return {
      top50: statusOf(m.getTopCoins()),
      global: statusOf(m.getGlobal()),
      trending: statusOf(m.getTrending()),
    };
  },
  // One Twelve Data batch per scope (8 credits = the whole minute). The TTLs decide whether the
  // provider is actually called, e.g. quotes only refresh at :00/:20/:40 while the market is open.
  stocks: () => ({ quotes: statusOf(getStocksService().getQuotes()) }),
  "stocks-intraday": () => ({ hourly: statusOf(getStocksService().getSeries("1d")) }),
  "stocks-daily": () => ({ daily: statusOf(getStocksService().getSeries("1y")) }),
  fx: () => {
    const f = getFxService();
    return { rates: statusOf(f.getRates()), history: statusOf(f.getHistories()) };
  },
  ai: () => ({ brief: statusOf(getAiService().getBrief()) }),
  // Daily check of a 7-day TTL: a cache hit costs nothing, so the World Bank is called weekly.
  macro: () => ({ indicators: statusOf(getMacroService().getIndicators()) }),
};

/** GET|POST /api/cron/warm?scope=<WARM_SCOPES> — Authorization: Bearer CRON_SECRET. */
async function warm(request: NextRequest): Promise<Response> {
  await connection();
  const noStore = { "cache-control": "no-store" };
  if (!authorizeCron(request.headers.get("authorization"), getEnv().CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const scope = parseScope(request.nextUrl.searchParams.get("scope"));
  if (!scope) {
    return Response.json(
      { error: `scope must be one of ${WARM_SCOPES.join(", ")}` },
      { status: 400, headers: noStore },
    );
  }

  const pending = WARMERS[scope]();
  const results = Object.fromEntries(
    await Promise.all(Object.entries(pending).map(async ([name, p]) => [name, await p] as const)),
  );
  const now = new Date().toISOString();
  const envelope: DataEnvelope<WarmReport> = {
    data: { scope, results },
    status: Object.values(results).every((s) => s === "unavailable") ? "unavailable" : "fresh",
    source: "internal",
    fetchedAt: now,
    nextRefreshAt: now,
  };
  // 503 tells the scheduler the warm-up achieved nothing, so repeated failures can alert.
  return Response.json(envelope, {
    status: envelope.status === "unavailable" ? 503 : 200,
    headers: noStore,
  });
}

export const GET = warm;
export const POST = warm;
