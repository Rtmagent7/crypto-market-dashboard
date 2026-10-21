import { describe, expect, it } from "vitest";

import { silentLogger } from "@/infra/logger";
import { createCallWithBudget } from "@/infra/outbound/call-with-budget";
import { createCoinGeckoClient } from "@/infra/providers/coingecko.client";
import { createExchangeRateClient } from "@/infra/providers/exchangerate.client";
import { createFrankfurterClient } from "@/infra/providers/frankfurter.client";
import { createGroqClient } from "@/infra/providers/groq.client";
import { createMemoryStore } from "@/infra/store";
import { createAiRepository } from "@/modules/ai/ai.repository";
import { createAiService } from "@/modules/ai/ai.service";
import { createFxRepository } from "@/modules/fx/fx.repository";
import { createFxService } from "@/modules/fx/fx.service";
import { createMarketRepository } from "@/modules/market/market.repository";
import { createMarketService } from "@/modules/market/market.service";

import { setupProviderMocks } from "../msw/server";

const { hits } = setupProviderMocks();
const START = Date.parse("2026-10-21T00:00:00Z");

const setup = (now: () => number): ReturnType<typeof createAiService> => {
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
  return createAiService({
    repository: createAiRepository({ callWithBudget, groq: createGroqClient({ apiKey: "t" }) }),
    market,
    fx,
    now,
  });
};

const readAll = async (stream: ReadableStream<string>): Promise<string> => {
  const reader = stream.getReader();
  let text = "";
  for (let r = await reader.read(); !r.done; r = await reader.read()) text += r.value;
  return text;
};

describe("quota compliance: Ask AI (spec §11: 100 questions/day across all visitors)", () => {
  it("streams real answers, then refuses question 101 without calling Groq", async () => {
    let clock = START;
    const ai = setup(() => clock);
    hits.clear();
    for (let i = 0; i < 100; i++) {
      clock = START + i * 7 * 60_000; // ≤ 10/min, spread over the UTC day
      const r = await ai.ask("How is Bitcoin doing today?");
      expect(r.status).toBe("streaming");
      if (r.status === "streaming" && i === 0) expect(await readAll(r.deltas)).toMatch(/\w+/);
      else if (r.status === "streaming") await r.deltas.cancel();
    }
    const groqCalls = hits.get("groq:/chat/completions") ?? 0;
    const refused = await ai.ask("And Ethereum?");
    expect(refused).toEqual({ status: "unavailable", reason: "budget-exhausted" });
    expect(hits.get("groq:/chat/completions")).toBe(groqCalls);
    expect(groqCalls).toBe(100);
  }, 60_000);
});

describe("quota compliance: AI brief (spec §4: 3 h TTL → 8 requests/day)", () => {
  it("a visitor every minute for 24 h triggers at most 8 Groq calls", async () => {
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
      repository: createAiRepository({ callWithBudget, groq: createGroqClient({ apiKey: "t" }) }),
      market,
      fx,
      now,
    });

    for (let t = START; t < START + 86_400_000; t += 60_000) {
      clock = t;
      const brief = await ai.getBrief();
      expect(brief.status).not.toBe("unavailable");
      expect(brief.data?.text).toContain("Bitcoin");
    }
    expect(hits.get("groq:/chat/completions")).toBeLessThanOrEqual(8);
  }, 60_000);
});
