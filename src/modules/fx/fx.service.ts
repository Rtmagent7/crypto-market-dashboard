import { FX_HISTORY_CURRENCIES, type HistoryCurrency } from "@/config/currencies";
import type { DataEnvelope, FxRates, PricePoint, UsdIdr } from "@/modules/shared/domain";
import { toEnvelope } from "@/modules/shared/envelope";
import { withFallback } from "@/modules/shared/fallback";

import { fromExchangeRate, fromFrankfurter, fromFrankfurterRange } from "./fx.mapper";
import { getFxRepository, type FxRepository } from "./fx.repository";

export interface FxService {
  getRates(): Promise<DataEnvelope<FxRates>>;
  getUsdIdr(): Promise<DataEnvelope<UsdIdr>>;
  getHistories(): Promise<DataEnvelope<Record<HistoryCurrency, PricePoint[]>>>;
}

const pctChange = (from: number, to: number): number =>
  Math.round(((to - from) / from) * 10_000) / 100;

export const createFxService = ({
  repository,
  now = Date.now,
}: {
  repository: FxRepository;
  now?: () => number;
}): FxService => {
  const getRates = (): Promise<DataEnvelope<FxRates>> =>
    withFallback(
      { provider: "frankfurter", load: repository.frankfurterLatest, map: fromFrankfurter },
      { provider: "exchangerate", load: repository.exchangerateLatest, map: fromExchangeRate },
      now(),
    );

  return {
    getRates,
    getHistories: async () =>
      toEnvelope(await repository.frankfurterRange(), {
        source: "frankfurter",
        map: (range) =>
          Object.fromEntries(
            FX_HISTORY_CURRENCIES.map((c) => [c, fromFrankfurterRange(range, c)]),
          ) as Record<HistoryCurrency, PricePoint[]>,
        now: now(),
      }),
    getUsdIdr: async () => {
      const [rates, range] = await Promise.all([getRates(), repository.frankfurterRange()]);
      const history = range.status === "unavailable" ? [] : fromFrankfurterRange(range.data, "IDR");
      const rate = rates.data?.rates.IDR;
      if (rates.data === null || rate === undefined)
        return { ...rates, data: null, status: "unavailable" };

      const previous = history.filter((p) => p.t < rates.data!.date).at(-1);
      return {
        ...rates,
        data: {
          rate,
          date: rates.data.date,
          change1dPct: previous ? pctChange(previous.v, rate) : null,
          history,
        },
      };
    },
  };
};

let service: FxService | undefined;

export const getFxService = (): FxService =>
  (service ??= createFxService({ repository: getFxRepository() }));
