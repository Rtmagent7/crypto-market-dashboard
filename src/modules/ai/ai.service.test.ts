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

const noBackup = { status: "unavailable", reason: "not-configured" } as const;

const BRIEF: MarketBrief = {
  text: "Bitcoin led.",
  model: "openai/gpt-oss-120b",
  promptVersion: "v",
};

describe("ai service", () => {
  it("builds the prompt lazily — only when the repository needs a new brief", async () => {
    const m = market();
    const repository: AiRepository = {
      ask: vi.fn(),
      workersAiSummary: vi.fn(async () => noBackup),
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
      ask: vi.fn(),
      workersAiSummary: vi.fn(async () => noBackup),
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
      ask: vi.fn(),
      workersAiSummary: vi.fn(async () => noBackup),
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

describe("ai service — ask", () => {
  const streamOf = (parts: string[]): ReadableStream<string> =>
    new ReadableStream({
      start(c) {
        parts.forEach((p) => c.enqueue(p));
        c.close();
      },
    });

  it("streams the answer and sends the question as data alongside cached market context", async () => {
    let sent = "";
    const repository: AiRepository = {
      summary: vi.fn(),
      workersAiSummary: vi.fn(),
      ask: vi.fn(async (messages) => {
        sent = JSON.stringify(messages);
        return {
          status: "fresh",
          data: streamOf(["Bitcoin ", "is up."]),
          fetchedAt: NOW,
          expiresAt: NOW,
          cacheHit: false,
        } as BudgetResult<ReadableStream<string>>;
      }),
    };
    const result = await createAiService({ repository, market: market(), fx, now: () => NOW }).ask(
      "How is BTC?",
    );
    expect(result.status).toBe("streaming");
    expect(sent).toContain("How is BTC?");
    expect(sent).toContain("BTC");
  });

  it("does not call the model without market data", async () => {
    const repository: AiRepository = {
      summary: vi.fn(),
      workersAiSummary: vi.fn(),
      ask: vi.fn(),
    };
    const result = await createAiService({
      repository,
      market: market(null),
      fx,
      now: () => NOW,
    }).ask("x");
    expect(result).toEqual({ status: "unavailable", reason: "no-market-data" });
    expect(repository.ask).not.toHaveBeenCalled();
  });

  it("reports the global daily cap distinctly", async () => {
    const repository: AiRepository = {
      summary: vi.fn(),
      workersAiSummary: vi.fn(),
      ask: vi.fn(
        async () =>
          ({ status: "unavailable", reason: "budget-exhausted" }) as BudgetResult<
            ReadableStream<string>
          >,
      ),
    };
    expect(
      await createAiService({ repository, market: market(), fx, now: () => NOW }).ask("x"),
    ).toEqual({
      status: "unavailable",
      reason: "budget-exhausted",
    });
  });
});

describe("ai service — Workers AI fallback for the brief (spec 10.2)", () => {
  const WAI_BRIEF: MarketBrief = {
    text: "Backup brief.",
    model: "@cf/meta/llama",
    promptVersion: "v",
  };
  const fresh = (data: MarketBrief): BudgetResult<MarketBrief> => ({
    status: "fresh",
    data,
    fetchedAt: NOW,
    expiresAt: NOW + 10_800_000,
    cacheHit: false,
  });
  const failed = { status: "unavailable", reason: "provider-error" } as const;

  it("never calls Workers AI while Groq has a fresh brief", async () => {
    const repository: AiRepository = {
      ask: vi.fn(),
      summary: vi.fn(async () => fresh(BRIEF)),
      workersAiSummary: vi.fn(async () => fresh(WAI_BRIEF)),
    };
    await createAiService({ repository, market: market(), fx, now: () => NOW }).getBrief();
    expect(repository.workersAiSummary).not.toHaveBeenCalled();
  });

  it("serves the Workers AI brief, and names it, when Groq fails", async () => {
    let sent = "";
    const repository: AiRepository = {
      ask: vi.fn(),
      summary: vi.fn(async () => failed),
      workersAiSummary: vi.fn(async (messages) => {
        sent = JSON.stringify(await messages());
        return fresh(WAI_BRIEF);
      }),
    };
    const env = await createAiService({
      repository,
      market: market(),
      fx,
      now: () => NOW,
    }).getBrief();
    expect(env).toMatchObject({ status: "fresh", source: "workers-ai", data: WAI_BRIEF });
    expect(sent).toContain("BTC"); // same prompt and context as Groq
  });

  it("falls back to the last Groq brief, labelled stale, when Workers AI fails too", async () => {
    const repository: AiRepository = {
      ask: vi.fn(),
      summary: vi.fn(async () => ({
        status: "stale" as const,
        data: BRIEF,
        fetchedAt: NOW - 14_400_000,
        expiresAt: NOW - 3_600_000,
        reason: "provider-error" as const,
      })),
      workersAiSummary: vi.fn(async () => failed),
    };
    const env = await createAiService({
      repository,
      market: market(),
      fx,
      now: () => NOW,
    }).getBrief();
    expect(env).toMatchObject({ status: "stale", source: "groq", data: BRIEF });
  });
});
