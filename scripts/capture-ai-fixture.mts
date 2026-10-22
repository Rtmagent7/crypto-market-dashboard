/**
 * Captures ONE real Groq summary for the MSW mock (tests/fixtures/groq-summary.json), using the
 * production prompt on fixture data. Run once: npm run fixtures:ai (reads .env.local).
 * `npm run fixtures:ai -- workers-ai` captures the Cloudflare Workers AI backup the same way.
 */
import { writeFile } from "node:fs/promises";

import { CgGlobal, CgMarkets } from "../src/infra/providers/coingecko.schema";
import { FfLatest, FfRange } from "../src/infra/providers/frankfurter.schema";
import { buildChatMessages, buildMarketContext, buildMessages } from "../src/modules/ai/prompts";
import { fromFrankfurter, fromFrankfurterRange } from "../src/modules/fx/fx.mapper";
import { fromCoinGecko, fromCoinGeckoGlobal } from "../src/modules/market/market.mapper";
import { AI } from "../src/config/ai";

import global from "../tests/fixtures/coingecko-global.json" with { type: "json" };
import markets from "../tests/fixtures/coingecko-markets.json" with { type: "json" };
import ffLatest from "../tests/fixtures/frankfurter-latest.json" with { type: "json" };
import ffRange from "../tests/fixtures/frankfurter-range-1y.json" with { type: "json" };

const mode = process.argv[2] ?? "summary";
const key = process.env.GROQ_API_KEY;
if (!key && mode !== "workers-ai") throw new Error("GROQ_API_KEY missing in .env.local");

const rates = fromFrankfurter(FfLatest.parse(ffLatest));
const history = fromFrankfurterRange(FfRange.parse(ffRange), "IDR");
const context = buildMarketContext({
  coins: CgMarkets.parse(markets).map(fromCoinGecko),
  global: fromCoinGeckoGlobal(CgGlobal.parse(global)),
  usdIdr: { rate: rates.rates.IDR!, date: rates.date, change1dPct: 0.32, history },
});

if (mode === "workers-ai") {
  const { CF_ACCOUNT_ID: account, CF_AI_TOKEN: token } = process.env;
  if (!account || !token) throw new Error("CF_ACCOUNT_ID / CF_AI_TOKEN missing in .env.local");
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${AI.workersAiModel}`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messages: buildMessages(context),
        max_tokens: AI.maxTokens,
        temperature: 0.2,
      }),
    },
  );
  const body = await res.json();
  await writeFile("tests/fixtures/workers-ai-summary.json", `${JSON.stringify(body, null, 2)}\n`);
  console.log(res.status, JSON.stringify(body.result?.usage));
  console.log(body.result?.choices?.[0]?.message?.content ?? JSON.stringify(body).slice(0, 400));
  process.exit(0);
}

if (mode === "chat") {
  // Ask AI: one real *streamed* answer (SSE) from the chat model, saved byte for byte.
  const stream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: AI.chatModel,
      messages: buildChatMessages(context, "How is Bitcoin doing today compared with Ethereum?"),
      max_completion_tokens: AI.maxTokens,
      temperature: 0.2,
      reasoning_effort: "low",
      include_reasoning: false,
      stream: true,
    }),
  });
  const text = await stream.text();
  await writeFile("tests/fixtures/groq-chat-stream.sse", text);
  console.log(
    stream.status,
    stream.headers.get("content-type"),
    `${text.split("\n\n").length} events`,
  );
  process.exit(0);
}

const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
  body: JSON.stringify({
    model: AI.summaryModel,
    messages: buildMessages(context),
    max_completion_tokens: AI.maxTokens,
    temperature: 0.2,
    reasoning_effort: "low",
    include_reasoning: false,
  }),
});
const body = await res.json();
await writeFile("tests/fixtures/groq-summary.json", `${JSON.stringify(body, null, 2)}\n`);
console.log(res.status, body.choices?.[0]?.finish_reason, JSON.stringify(body.usage));
console.log(body.choices?.[0]?.message?.content);
