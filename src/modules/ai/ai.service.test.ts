import { describe, expect, it, vi } from "vitest";

import type { FxService } from "@/modules/fx/fx.service";
import type { MarketService } from "@/modules/market/market.service";
import type { DataEnvelope, MarketBrief } from "@/modules/shared/domain";

import { fixtureCoins } from "../../../tests/factories/market";

import type { AiRepository, BudgetResult } from "./ai.repository";
import { createAiService } from "./ai.service";

const NOW = Date.parse("2026-10-21T10:00:00Z");
const ok = <T>(data: T | null): DataEnvelope<T> => ({
  data,
  status: data === null ? "unavailable" : "fresh",
  source: "coingecko",
  fetchedAt: new Date(NOW).toISOString(),
  nextRefreshAt: new Date(NOW + 900_000).toISOString(),
});

const market = (coins = fixtureCoins() as ReturnType<typeof fixtureCoins> | null): MarketService =>
  ({
    getTopCoins: vi.fn(async () => ok(coins)),
    getGlobal: vi.fn(async () =>
      ok({
        totalMarketCapUsd: 2.84e12,
        marketCapChange24hPct: -0.4,
        btcDominancePct: 59.7,
        volume24hUsd: 8e10,
      }),
    ),
    getTrending: vi.fn(),
    getCoin: vi.fn(),
    getChart: vi.fn(),
  }) as unknown as MarketService;
const fx = {
  getUsdIdr: vi.fn(async () =>
    ok({ rate: 18_043, date: "2026-10-21", change1dPct: 0.3, history: [] }),
  ),
} as unknown as FxService;

const BRIEF: MarketBrief = {
  text: "Bitcoin led.",
  model: "openai/gpt-oss-120b",
  promptVersion: "v",
};

describe("ai service", () => {
  it("builds the prompt lazily — only when the repository needs a new brief", async () => {
    const m = market();
    const repository: AiRepository = {
      summary: vi.fn(async (): Promise<BudgetResult<MarketBrief>> => ({
        status: "fresh",
        data: BRIEF,
        fetchedAt: NOW,
        expiresAt: NOW + 1,
        cacheHit: true,
      })),
    };
    const env = await createAiService({ repository, market: m, fx, now: () => NOW }).getBrief();
    expect(env).toMatchObject({ status: "fresh", source: "groq", data: BRIEF });
    expect(m.getTopCoins).not.toHaveBeenCalled();
  });

  it("feeds the model structured market context from the cache", async () => {
    let sent = "";
    const repository: AiRepository = {
      summary: vi.fn(async (messages) => {
        sent = JSON.stringify(await messages());
        return {
          status: "fresh",
          data: BRIEF,
          fetchedAt: NOW,
          expiresAt: NOW + 1,
          cacheHit: false,
        } as BudgetResult<MarketBrief>;
      }),
    };
    await createAiService({ repository, market: market(), fx, now: () => NOW }).getBrief();
    expect(sent).toContain("BTC");
    expect(sent).toContain("18043");
  });

  it("refuses to ask the model about nothing when market data is missing", async () => {
    const repository: AiRepository = {
      summary: vi.fn(async (messages) => {
        await expect(messages()).rejects.toThrow(/no market data/);
        return { status: "unavailable", reason: "provider-error" } as BudgetResult<MarketBrief>;
      }),
    };
    const env = await createAiService({
      repository,
      market: market(null),
      fx,
      now: () => NOW,
    }).getBrief();
    expect(env).toMatchObject({ status: "unavailable", data: null });
  });
});
