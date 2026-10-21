import { connection } from "next/server";
import type { ReactNode } from "react";

import { TopCoinsWidget } from "@/components/market/top-coins-widget";
import { getMarketService } from "@/modules/market/market.service";

/** Request-time read from the shared cache; streamed into the prerendered shell. */
export async function TopCoins(): Promise<ReactNode> {
  await connection();
  return <TopCoinsWidget initial={await getMarketService().getTopCoins()} />;
}
