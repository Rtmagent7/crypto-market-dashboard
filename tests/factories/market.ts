import { CgMarkets } from "@/infra/providers/coingecko.schema";
import { fromCoinGecko } from "@/modules/market/market.mapper";
import type { CryptoAsset } from "@/modules/shared/domain";

import markets from "../fixtures/coingecko-markets.json";

/** The real top-50 fixture, validated and mapped exactly like production does. */
export const fixtureCoins = (): CryptoAsset[] => CgMarkets.parse(markets).map(fromCoinGecko);
