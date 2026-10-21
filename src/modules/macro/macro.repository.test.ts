import { describe, expect, it, vi } from "vitest";

import { CACHE_POLICY } from "@/config/cache-policy";
import { MACRO_INDICATORS } from "@/config/macro";
import type { BudgetedCall, CallWithBudget } from "@/infra/outbound/call-with-budget";
import type { WorldBankClient } from "@/infra/providers/worldbank.client";

import { createMacroRepository } from "./macro.repository";

describe("macro repository", () => {
  it("makes one budgeted World Bank call with the 7-day policy, up to the current year", async () => {
    let call: BudgetedCall<unknown> | undefined;
    const callWithBudget = vi.fn(async (c: BudgetedCall<unknown>) => {
      call = c;
      await c.fetcher(new AbortController().signal);
      return { status: "unavailable", reason: "provider-error" } as const;
    }) as unknown as CallWithBudget;
    const worldbank: WorldBankClient = { indicators: vi.fn(async () => [] as never) };

    await createMacroRepository({
      callWithBudget,
      worldbank,
      now: () => Date.parse("2027-03-01T00:00:00Z"),
    }).indicators();

    expect(call).toMatchObject({
      budget: "worldbank",
      cacheKey: "worldbank:indicators:IDN",
      policy: CACHE_POLICY["worldbank:indicators"],
    });
    expect(worldbank.indicators).toHaveBeenCalledWith(
      "IDN",
      MACRO_INDICATORS.map((i) => i.id),
      { from: 2010, to: 2027 },
      expect.any(AbortSignal),
    );
  });
});
