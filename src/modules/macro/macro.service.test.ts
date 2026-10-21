import { describe, expect, it, vi } from "vitest";

import { WbIndicators } from "@/infra/providers/worldbank.schema";

import indicators from "../../../tests/fixtures/worldbank-indicators.json";

import type { BudgetResult, MacroRepository } from "./macro.repository";
import { createMacroService } from "./macro.service";

const NOW = Date.parse("2026-10-22T00:00:00Z");
const WEEK = 7 * 86_400_000;
const wb = WbIndicators.parse(indicators);

const repo = (result: BudgetResult<WbIndicators>): MacroRepository => ({
  indicators: vi.fn(async () => result),
});

describe("macro service", () => {
  it("serves fresh World Bank data with the next refresh a week out", async () => {
    const env = await createMacroService({
      repository: repo({
        status: "fresh",
        data: wb,
        fetchedAt: NOW,
        expiresAt: NOW + WEEK,
        cacheHit: false,
      }),
      now: () => NOW,
    }).getIndicators();
    expect(env).toMatchObject({
      status: "fresh",
      source: "worldbank",
      nextRefreshAt: new Date(NOW + WEEK).toISOString(),
    });
    expect(env.data).toHaveLength(5);
  });

  it("keeps serving stale data, labelled stale, when the provider fails", async () => {
    const env = await createMacroService({
      repository: repo({
        status: "stale",
        data: wb,
        fetchedAt: NOW - 2 * WEEK,
        expiresAt: NOW - WEEK,
        reason: "provider-error",
      }),
      now: () => NOW,
    }).getIndicators();
    expect(env.status).toBe("stale");
    expect(env.data?.[0]?.history.length).toBeGreaterThan(0);
  });

  it("is unavailable, with null data, when nothing is cached and no call is possible", async () => {
    const env = await createMacroService({
      repository: repo({ status: "unavailable", reason: "budget-exhausted" }),
      now: () => NOW,
    }).getIndicators();
    expect(env).toMatchObject({ status: "unavailable", data: null, source: "worldbank" });
  });
});
