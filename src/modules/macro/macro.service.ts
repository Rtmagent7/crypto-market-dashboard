import type { DataEnvelope, MacroIndicator } from "@/modules/shared/domain";
import { toEnvelope } from "@/modules/shared/envelope";

import { fromWorldBank } from "./macro.mapper";
import { getMacroRepository, type MacroRepository } from "./macro.repository";

export interface MacroService {
  getIndicators(): Promise<DataEnvelope<MacroIndicator[]>>;
}

/** World Bank is the only source (spec 10.2 lists no backup); stale cache is the fallback. */
export const createMacroService = ({
  repository,
  now = Date.now,
}: {
  repository: MacroRepository;
  now?: () => number;
}): MacroService => ({
  getIndicators: async () =>
    toEnvelope(await repository.indicators(), {
      source: "worldbank",
      map: fromWorldBank,
      now: now(),
    }),
});

let service: MacroService | undefined;

export const getMacroService = (): MacroService =>
  (service ??= createMacroService({ repository: getMacroRepository() }));
