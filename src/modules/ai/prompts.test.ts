import { describe, expect, it } from "vitest";

import type { GlobalMarket, UsdIdr } from "@/modules/shared/domain";

import { fixtureCoins } from "../../../tests/factories/market";

import { PROMPT_VERSION, buildMarketContext, buildMessages } from "./prompts";

const global: GlobalMarket = {
  totalMarketCapUsd: 2_840_000_000_000,
  marketCapChange24hPct: -0.4612,
  btcDominancePct: 59.71,
  volume24hUsd: 83_400_000_000,
};
const usdIdr: UsdIdr = { rate: 18_043, date: "2026-10-21", change1dPct: 0.32, history: [] };

describe("buildMarketContext — structured, server-side, bounded", () => {
  const ctx = buildMarketContext({ coins: fixtureCoins(), global, usdIdr });

  it("summarizes the market with rounded numbers", () => {
    expect(ctx.global).toEqual({
      marketCapUsdT: 2.84,
      change24hPct: -0.46,
      btcDominancePct: 59.7,
      volume24hUsdB: 83.4,
    });
    expect(ctx.usdIdr).toEqual({ rate: 18_043, change1dPct: 0.32 });
  });

  it("lists the top 10 and the biggest movers of the top 50", () => {
    expect(ctx.top10).toHaveLength(10);
    expect(ctx.top10[0]).toMatchObject({ symbol: "BTC", rank: 1 });
    expect(ctx.gainers).toHaveLength(3);
    expect(ctx.losers).toHaveLength(3);
    expect(ctx.gainers[0]!.change24hPct).toBeGreaterThanOrEqual(ctx.gainers[2]!.change24hPct);
  });

  it("stays small enough for the ~800-token context budget", () => {
    expect(JSON.stringify(ctx).length).toBeLessThan(2_400);
  });

  it("never contains free text from outside (no injection surface)", () => {
    const text = JSON.stringify(ctx);
    expect(text).not.toMatch(/https?:\/\//);
  });
});

describe("buildMessages — deterministic prompt template", () => {
  it("is byte-identical for identical input (snapshot)", () => {
    const ctx = buildMarketContext({ coins: fixtureCoins(), global, usdIdr });
    expect(buildMessages(ctx)).toEqual(buildMessages(structuredClone(ctx)));
    expect(buildMessages(ctx)).toMatchSnapshot();
  });

  it("restricts topic, length and format, and forbids advice", () => {
    const [system] = buildMessages(buildMarketContext({ coins: fixtureCoins(), global, usdIdr }));
    expect(system!.role).toBe("system");
    expect(system!.content).toMatch(/only the market data provided/i);
    expect(system!.content).toMatch(/120 words/);
    expect(system!.content).toMatch(/plain text/i);
    expect(system!.content).toMatch(/not .*advice/i);
    expect(PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
});
