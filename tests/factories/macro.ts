import { WbIndicators } from "@/infra/providers/worldbank.schema";
import { fromWorldBank } from "@/modules/macro/macro.mapper";
import type { MacroIndicator } from "@/modules/shared/domain";

import indicators from "../fixtures/worldbank-indicators.json";

/** The real World Bank fixture, validated and mapped exactly like production does. */
export const fixtureIndicators = (): MacroIndicator[] =>
  fromWorldBank(WbIndicators.parse(indicators));
