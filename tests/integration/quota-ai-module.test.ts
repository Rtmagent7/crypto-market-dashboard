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
