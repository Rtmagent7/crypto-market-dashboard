import { getFxService, type FxService } from "@/modules/fx/fx.service";
import { getMarketService, type MarketService } from "@/modules/market/market.service";
import type { DataEnvelope, MarketBrief } from "@/modules/shared/domain";
import { toEnvelope } from "@/modules/shared/envelope";

import { getAiRepository, type AiRepository } from "./ai.repository";
import { buildMarketContext, buildMessages } from "./prompts";

export interface AiService {
  getBrief(): Promise<DataEnvelope<MarketBrief>>;
}

/**
 * The brief is built from data already in the shared cache (no extra provider calls), and only
 * when the 3-hour cache needs a new one. Workers AI joins as the fallback once its key exists.
 */
export const createAiService = ({
  repository,
  market,
  fx,
  now = Date.now,
}: {
  repository: AiRepository;
  market: MarketService;
  fx: FxService;
  now?: () => number;
}): AiService => ({
  getBrief: async () => {
    const messages = async (): Promise<ReturnType<typeof buildMessages>> => {
      const [top, global, usdIdr] = await Promise.all([
        market.getTopCoins(),
        market.getGlobal(),
        fx.getUsdIdr(),
      ]);
      if (!top.data) throw new Error("no market data to summarize");
      return buildMessages(
        buildMarketContext({ coins: top.data, global: global.data, usdIdr: usdIdr.data }),
      );
    };
    return toEnvelope(await repository.summary(messages), {
      source: "groq",
      map: (b) => b,
      now: now(),
    });
  },
});

let service: AiService | undefined;

export const getAiService = (): AiService =>
  (service ??= createAiService({
    repository: getAiRepository(),
    market: getMarketService(),
    fx: getFxService(),
  }));
