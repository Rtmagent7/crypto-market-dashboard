import { readFileSync } from "node:fs";
import { join } from "node:path";

import { http, HttpResponse, type HttpHandler } from "msw";

import cgChart1y from "../fixtures/coingecko-market-chart-1y.json";
import cgChart30d from "../fixtures/coingecko-market-chart-30d.json";
import cgGlobal from "../fixtures/coingecko-global.json";
import cgMarkets from "../fixtures/coingecko-markets.json";
import cgTrending from "../fixtures/coingecko-trending.json";
import erLatest from "../fixtures/exchangerate-latest-open.json";
import ffLatest from "../fixtures/frankfurter-latest.json";
import ffRange from "../fixtures/frankfurter-range-1y.json";
import tdQuote from "../fixtures/twelvedata-quote.json";
import tdDaily from "../fixtures/twelvedata-time-series-1day.json";
import groqSummary from "../fixtures/groq-summary.json";
import tdHourly from "../fixtures/twelvedata-time-series-1h.json";
import wbIndicators from "../fixtures/worldbank-indicators.json";

// Provider mocks served from real captured responses (tests/fixtures). Used by Vitest and,
// with MOCK_PROVIDERS=1, by the dev/E2E server via instrumentation.ts — zero real quota.

const CG = "https://api.coingecko.com/api/v3";
const FF = "https://api.frankfurter.dev/v1";
const TD = "https://api.twelvedata.com";

// A real captured Groq stream (`npm run fixtures:ai -- chat`), replayed byte for byte. Read from
// the repo root: both Vitest and the mock-mode Next server run there.
const groqChatStream = readFileSync(
  join(process.cwd(), "tests/fixtures/groq-chat-stream.sse"),
  "utf8",
);

/** Counts requests per logical endpoint so quota tests can assert real call volume. */
export type HitCounter = Map<string, number>;

export const createProviderHandlers = (hits: HitCounter = new Map()): HttpHandler[] => {
  const hit = (name: string): void => {
    hits.set(name, (hits.get(name) ?? 0) + 1);
  };

  return [
    http.get(
      `${CG}/coins/markets`,
      () => (hit("coingecko:/coins/markets"), HttpResponse.json(cgMarkets)),
    ),
    http.get(`${CG}/global`, () => (hit("coingecko:/global"), HttpResponse.json(cgGlobal))),
    http.get(
      `${CG}/search/trending`,
      () => (hit("coingecko:/search/trending"), HttpResponse.json(cgTrending)),
    ),
    http.get(`${CG}/coins/:id/market_chart`, ({ request }) => {
      hit("coingecko:/coins/:id/market_chart");
      const days = new URL(request.url).searchParams.get("days");
      return HttpResponse.json(days === "365" ? cgChart1y : cgChart30d);
    }),
    http.get(`${FF}/latest`, () => (hit("frankfurter:/latest"), HttpResponse.json(ffLatest))),
    http.get(`${FF}/:range`, () => (hit("frankfurter:/range"), HttpResponse.json(ffRange))),
    http.get(`${TD}/quote`, () => (hit("twelvedata:/quote"), HttpResponse.json(tdQuote))),
    http.get(`${TD}/time_series`, ({ request }) => {
      hit("twelvedata:/time_series");
      const interval = new URL(request.url).searchParams.get("interval");
      return HttpResponse.json(interval === "1day" ? tdDaily : tdHourly);
    }),
    http.get(
      "https://open.er-api.com/v6/latest/USD",
      () => (hit("exchangerate:/latest"), HttpResponse.json(erLatest)),
    ),
    http.get(
      "https://api.worldbank.org/v2/country/:country/indicator/:ids",
      () => (hit("worldbank:/indicator"), HttpResponse.json(wbIndicators)),
    ),
    http.post("https://api.groq.com/openai/v1/chat/completions", async ({ request }) => {
      hit("groq:/chat/completions");
      const body = (await request.json()) as { stream?: boolean } | null;
      if (body?.stream) {
        return new HttpResponse(groqChatStream, {
          headers: { "content-type": "text/event-stream" },
        });
      }
      return HttpResponse.json(groqSummary);
    }),
  ];
};
