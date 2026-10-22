import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { BUDGETS } from "@/infra/outbound/budgets";
import { silentLogger } from "@/infra/logger";
import { createCallWithBudget } from "@/infra/outbound/call-with-budget";
import { createCoinGeckoClient } from "@/infra/providers/coingecko.client";
import { createExchangeRateClient } from "@/infra/providers/exchangerate.client";
import { createFrankfurterClient } from "@/infra/providers/frankfurter.client";
import { createGroqClient } from "@/infra/providers/groq.client";
import { createWorkersAiClient } from "@/infra/providers/workers-ai.client";
import { createMemoryStore } from "@/infra/store";
import { createAiRepository } from "@/modules/ai/ai.repository";
import { createAiService } from "@/modules/ai/ai.service";
import { createFxRepository } from "@/modules/fx/fx.repository";
import { createFxService } from "@/modules/fx/fx.service";
import { createMarketRepository } from "@/modules/market/market.repository";
import { createMarketService } from "@/modules/market/market.service";

import { setupProviderMocks } from "../msw/server";

const { hits, server } = setupProviderMocks();
const START = Date.parse("2026-10-22T00:00:00Z");
const DAY = 86_400_000;

const setup = (): { ai: ReturnType<typeof createAiService>; at: (t: number) => void } => {
  let clock = START;
  const now = (): number => clock;
  const callWithBudget = createCallWithBudget({
    store: createMemoryStore(now),
    logger: silentLogger,
    now,
    sleep: async () => undefined,
  });
  const market = createMarketService({
    repository: createMarketRepository({ callWithBudget, coingecko: createCoinGeckoClient({}) }),
    now,
  });
  const fx = createFxService({
    repository: createFxRepository({
      callWithBudget,
      frankfurter: createFrankfurterClient(),
      exchangerate: createExchangeRateClient(),
      now,
    }),
    now,
  });
  const ai = createAiService({
    repository: createAiRepository({
      callWithBudget,
      groq: createGroqClient({ apiKey: "t" }),
      workersAi: createWorkersAiClient({ accountId: "a", apiToken: "t" }),
    }),
    market,
    fx,
    now,
  });
  return { ai, at: (t) => (clock = t) };
};

describe("quota compliance: Workers AI fallback for the brief (cap 40/day)", () => {
  it("costs nothing while Groq is healthy", async () => {
    const { ai, at } = setup();
    for (let t = START; t < START + DAY; t += 5 * 60_000) {
      at(t);
      await ai.getBrief();
    }
    expect(hits.get("workers-ai:/ai/run") ?? 0).toBe(0);
  }, 60_000);

  it("a full day of Groq outage: a fresh brief from Workers AI every 3 h, never past its cap", async () => {
    server.use(
      http.post("https://api.groq.com/openai/v1/chat/completions", () =>
        HttpResponse.json({ error: { message: "rate limited" } }, { status: 429 }),
      ),
    );
    const { ai, at } = setup();
    for (let t = START; t < START + DAY; t += 60_000) {
      at(t);
      const brief = await ai.getBrief();
      expect(brief.status).toBe("fresh");
      expect(brief.source).toBe("workers-ai");
      expect(brief.data?.text).toContain("Bitcoin");
    }
    expect(hits.get("workers-ai:/ai/run")).toBeLessThanOrEqual(8);
    expect(hits.get("workers-ai:/ai/run")).toBeLessThanOrEqual(BUDGETS["workers-ai"].cap);
  }, 60_000);
});
