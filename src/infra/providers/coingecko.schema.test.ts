import { describe, expect, it } from "vitest";

import chart1y from "../../../tests/fixtures/coingecko-market-chart-1y.json";
import chart30d from "../../../tests/fixtures/coingecko-market-chart-30d.json";
import global from "../../../tests/fixtures/coingecko-global.json";
import markets from "../../../tests/fixtures/coingecko-markets.json";
import trending from "../../../tests/fixtures/coingecko-trending.json";

import { CgGlobal, CgMarketChart, CgMarkets, CgTrending } from "./coingecko.schema";

describe("CoinGecko schemas match real fixtures", () => {
  it("/coins/markets: 50 coins with a 7-day sparkline", () => {
    const parsed = CgMarkets.parse(markets);
    expect(parsed).toHaveLength(50);
    expect(parsed[0]?.sparkline_in_7d?.price.length).toBeGreaterThan(100);
  });

  it("/coins/markets keeps sub-cent prices exactly (real extreme from the fixture)", () => {
    const min = Math.min(...CgMarkets.parse(markets).map((c) => c.current_price));
    expect(min).toBeGreaterThan(0);
    expect(min).toBeLessThan(0.0001);
  });

  it("/global, /search/trending, /market_chart (30d hourly, 1y daily)", () => {
    expect(CgGlobal.parse(global).data.market_cap_percentage.btc).toBeGreaterThan(0);
    expect(CgTrending.parse(trending).coins.length).toBeGreaterThan(0);
    expect(CgMarketChart.parse(chart30d).prices.length).toBeGreaterThan(700);
    expect(CgMarketChart.parse(chart1y).prices.length).toBeGreaterThan(360);
  });

  it("rejects a changed format instead of letting it reach the UI", () => {
    const broken = structuredClone(markets) as Record<string, unknown>[];
    broken[0] = { ...broken[0], current_price: "83692" };
    expect(CgMarkets.safeParse(broken).success).toBe(false);
  });
});
