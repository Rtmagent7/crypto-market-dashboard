import "server-only";

import { CACHE_POLICY } from "@/config/cache-policy";
import { MACRO_COUNTRY, MACRO_FROM_YEAR, MACRO_INDICATORS } from "@/config/macro";
import type { BudgetResult, CallWithBudget } from "@/infra/outbound/call-with-budget";
import { getCallWithBudget } from "@/infra/outbound/gate";
import { createWorldBankClient, type WorldBankClient } from "@/infra/providers/worldbank.client";
import type { WbIndicators } from "@/infra/providers/worldbank.schema";

export type { BudgetResult };

export interface MacroRepository {
  indicators(): Promise<BudgetResult<WbIndicators>>;
}

const IDS = MACRO_INDICATORS.map((i) => i.id);

export const createMacroRepository = ({
  callWithBudget,
  worldbank,
  now = Date.now,
}: {
  callWithBudget: CallWithBudget;
  worldbank: WorldBankClient;
  now?: () => number;
}): MacroRepository => ({
  indicators: () =>
    callWithBudget({
      budget: "worldbank",
      endpoint: "/country/{iso3}/indicator/{ids}",
      cacheKey: `worldbank:indicators:${MACRO_COUNTRY.iso3}`,
      policy: CACHE_POLICY["worldbank:indicators"],
      // The year window is computed when the provider is actually called.
      fetcher: (signal) =>
        worldbank.indicators(
          MACRO_COUNTRY.iso3,
          IDS,
          { from: MACRO_FROM_YEAR, to: new Date(now()).getUTCFullYear() },
          signal,
        ),
    }),
});

let repository: MacroRepository | undefined;

export const getMacroRepository = (): MacroRepository =>
  (repository ??= createMacroRepository({
    callWithBudget: getCallWithBudget(),
    worldbank: createWorldBankClient(),
  }));
