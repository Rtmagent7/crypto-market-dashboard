import { MACRO_INDICATORS } from "@/config/macro";
import type { WbIndicators } from "@/infra/providers/worldbank.schema";
import type { MacroIndicator } from "@/modules/shared/domain";

/** World Bank rows → one indicator per whitelisted code, in config order, oldest year first. */
export const fromWorldBank = ([, rows]: WbIndicators): MacroIndicator[] =>
  MACRO_INDICATORS.map(({ id, label, unit, description }) => ({
    id,
    label,
    unit,
    description,
    history: rows
      .flatMap((r) =>
        r.indicator.id === id && r.value !== null ? [{ t: r.date, v: r.value }] : [],
      )
      .sort((a, b) => a.t.localeCompare(b.t)),
  }));
