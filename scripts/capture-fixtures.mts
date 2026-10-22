/**
 * Phase 0 — capture ONE real response per endpoint in the calibration table (spec Section 4)
 * and save it to tests/fixtures/<provider>-<endpoint>.json. Response headers go to
 * tests/fixtures/_meta/ so quota reset behavior can be verified (Open Decision #4).
 *
 * Run: npm run fixtures:capture  (reads .env.local; never runs in CI or tests)
 *      npm run fixtures:capture -- worldbank  (only targets whose name starts with an argument)
 *
 * Without a key, endpoints that have an official keyless/demo variant use it, and the
 * fixture is marked `keyless`. Endpoints that need a key and have none are skipped.
 * Secrets are never written to disk: URLs are stored with keys redacted.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = "tests/fixtures";
const env = process.env;
const TICKERS = "AAPL,MSFT,NVDA,GOOGL,AMZN,META,TSLA,SPY";
// Groq candidates (Open Decision #2): different models so summary and chat use separate quotas.
const GROQ_SUMMARY_MODEL = "openai/gpt-oss-120b";
const GROQ_CHAT_MODEL = "openai/gpt-oss-20b";
// An 8-symbol Twelve Data batch spends the whole 8-credits/minute allowance.
const TWELVEDATA_GAP_MS = 62_000;

interface Target {
  name: string;
  url: string;
  headers?: Record<string, string>;
  init?: RequestInit;
  /** Present when the call uses a keyless or demo variant instead of the real key. */
  keyless?: string;
}

const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

const coingecko = (): Target[] => {
  const key = env.COINGECKO_API_KEY;
  const base = "https://api.coingecko.com/api/v3";
  const headers: Record<string, string> = key ? { "x-cg-demo-api-key": key } : {};
  const keyless = key ? undefined : "public API (no key), same schema as Demo";
  return [
    {
      name: "coingecko-markets",
      url: `${base}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`,
      headers,
      keyless,
    },
    { name: "coingecko-global", url: `${base}/global`, headers, keyless },
    { name: "coingecko-trending", url: `${base}/search/trending`, headers, keyless },
    {
      name: "coingecko-market-chart-30d",
      url: `${base}/coins/bitcoin/market_chart?vs_currency=usd&days=30`,
      headers,
      keyless,
    },
    {
      name: "coingecko-market-chart-1y",
      url: `${base}/coins/bitcoin/market_chart?vs_currency=usd&days=365`,
      headers,
      keyless,
    },
  ];
};

const twelvedata = (): Target[] => {
  const key = env.TWELVEDATA_API_KEY;
  const base = "https://api.twelvedata.com";
  // The `demo` key only serves a few symbols one at a time, so the batch shape (an object
  // keyed by symbol) can only be captured with a real key.
  const symbols = key ? TICKERS : "AAPL";
  const apikey = key ?? "demo";
  const keyless = key ? undefined : "demo key, single symbol — recapture batch with a real key";
  return [
    { name: "twelvedata-quote", url: `${base}/quote?symbol=${symbols}&apikey=${apikey}`, keyless },
    {
      name: "twelvedata-time-series-1h",
      url: `${base}/time_series?symbol=${symbols}&interval=1h&outputsize=24&apikey=${apikey}`,
      keyless,
    },
    {
      name: "twelvedata-time-series-1day",
      url: `${base}/time_series?symbol=${symbols}&interval=1day&outputsize=252&apikey=${apikey}`,
      keyless,
    },
  ];
};

const frankfurter = (): Target[] => {
  const base = "https://api.frankfurter.dev/v1";
  return [
    { name: "frankfurter-latest", url: `${base}/latest?from=USD` },
    {
      name: "frankfurter-range-1y",
      url: `${base}/${isoDaysAgo(365)}..?from=USD&to=IDR,EUR,JPY,SGD,GBP`,
    },
  ];
};

const exchangerate = (): Target[] => {
  const key = env.EXCHANGERATE_API_KEY;
  return key
    ? [{ name: "exchangerate-latest", url: `https://v6.exchangerate-api.com/v6/${key}/latest/USD` }]
    : [
        {
          name: "exchangerate-latest-open",
          url: "https://open.er-api.com/v6/latest/USD",
          keyless: "open access endpoint; keyed endpoint adds conversion_rates naming",
        },
      ];
};

// Indonesia macro indicators for /macro: one multi-indicator request (source=2 = WDI).
const WORLDBANK_INDICATORS = [
  "NY.GDP.MKTP.KD.ZG",
  "FP.CPI.TOTL.ZG",
  "SL.UEM.TOTL.ZS",
  "NY.GDP.PCAP.CD",
  "BN.CAB.XOKA.GD.ZS",
];

const worldbank = (): Target[] => [
  {
    name: "worldbank-indicators",
    url: `https://api.worldbank.org/v2/country/IDN/indicator/${WORLDBANK_INDICATORS.join(";")}?source=2&format=json&date=2010:2026&per_page=500`,
  },
];

const keyed = (): Target[] => {
  const targets: Target[] = [];
  if (env.CMC_API_KEY) {
    targets.push({
      name: "coinmarketcap-listings",
      url: "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=50&convert=USD",
      headers: { "X-CMC_PRO_API_KEY": env.CMC_API_KEY },
    });
  }
  if (env.FINNHUB_API_KEY) {
    const fh = "https://finnhub.io/api/v1";
    const token = env.FINNHUB_API_KEY;
    targets.push(
      { name: "finnhub-quote", url: `${fh}/quote?symbol=AAPL&token=${token}` },
      // Unknown symbols still answer 200, with zeros and nulls.
      { name: "finnhub-quote-unknown", url: `${fh}/quote?symbol=ZZZZNOTREAL&token=${token}` },
      {
        name: "finnhub-market-status",
        url: `${fh}/stock/market-status?exchange=US&token=${token}`,
      },
    );
  }
  if (env.GROQ_API_KEY) {
    const auth = { Authorization: `Bearer ${env.GROQ_API_KEY}` };
    targets.push({
      name: "groq-models",
      url: "https://api.groq.com/openai/v1/models",
      headers: auth,
    });
    // One 1-token completion per candidate model: the response headers carry the account's
    // real per-model limits (x-ratelimit-limit-requests / -tokens), Open Decision #2.
    for (const [slug, model] of [
      ["summary-model", GROQ_SUMMARY_MODEL],
      ["chat-model", GROQ_CHAT_MODEL],
    ] as const) {
      targets.push({
        name: `groq-chat-${slug}`,
        url: "https://api.groq.com/openai/v1/chat/completions",
        headers: { ...auth, "content-type": "application/json" },
        init: {
          method: "POST",
          body: JSON.stringify({
            model,
            max_tokens: 1,
            messages: [{ role: "user", content: "Reply with OK." }],
          }),
        },
      });
    }
  }
  if (env.CF_ACCOUNT_ID && env.CF_AI_TOKEN) {
    targets.push({
      name: "workers-ai-models",
      url: `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/models/search?task=Text%20Generation`,
      headers: { Authorization: `Bearer ${env.CF_AI_TOKEN}` },
    });
  }
  return targets;
};

const SECRET_VALUES = [
  env.COINGECKO_API_KEY,
  env.TWELVEDATA_API_KEY,
  env.EXCHANGERATE_API_KEY,
  env.FINNHUB_API_KEY,
  env.CF_ACCOUNT_ID,
].filter((v): v is string => Boolean(v));

const redact = (text: string): string =>
  SECRET_VALUES.reduce((acc, secret) => acc.split(secret).join("<redacted>"), text);

const capture = async (target: Target): Promise<string> => {
  const res = await fetch(target.url, { ...target.init, headers: target.headers });
  const body: unknown = await res.json();
  const headers = Object.fromEntries(
    [...res.headers.entries()].filter(([k]) =>
      /rate|limit|credit|retry|date|cache|age|quota|remaining|reset/i.test(k),
    ),
  );
  await writeFile(join(OUT, `${target.name}.json`), `${JSON.stringify(body, null, 2)}\n`);
  await writeFile(
    join(OUT, "_meta", `${target.name}.meta.json`),
    `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        url: redact(target.url),
        status: res.status,
        keyless: target.keyless ?? null,
        headers,
      },
      null,
      2,
    )}\n`,
  );
  return `${res.ok ? "ok " : "ERR"} ${res.status} ${target.name}${target.keyless ? `  (${target.keyless})` : ""}`;
};

const main = async (): Promise<void> => {
  await mkdir(join(OUT, "_meta"), { recursive: true });
  const only = process.argv.slice(2);
  const targets = [
    ...coingecko(),
    ...twelvedata(),
    ...frankfurter(),
    ...exchangerate(),
    ...worldbank(),
    ...keyed(),
  ].filter((t) => only.length === 0 || only.some((prefix) => t.name.startsWith(prefix)));
  // Sequential on purpose: Twelve Data allows 8 credits/min and the demo key far fewer.
  for (const target of targets) {
    try {
      console.log(await capture(target));
    } catch (err) {
      console.log(`ERR ${target.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
    const gap = target.name.startsWith("twelvedata")
      ? env.TWELVEDATA_API_KEY
        ? TWELVEDATA_GAP_MS
        : 9_000
      : 1_500;
    await new Promise((r) => setTimeout(r, gap));
  }
  const missing = ["CMC_API_KEY", "FINNHUB_API_KEY", "GROQ_API_KEY", "CF_AI_TOKEN"].filter(
    (k) => !env[k],
  );
  if (missing.length > 0) console.log(`skipped (no key): ${missing.join(", ")}`);
};

await main();
