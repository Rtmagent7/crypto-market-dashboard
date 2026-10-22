import { describe, expect, it } from "vitest";

import { COIN_WHITELIST } from "@/config/coins";
import { CgMarkets } from "@/infra/providers/coingecko.schema";
import { CmcListings } from "@/infra/providers/coinmarketcap.schema";

import cgMarkets from "../../../tests/fixtures/coingecko-markets.json";
import listings from "../../../tests/fixtures/coinmarketcap-listings.json";

import { fromCoinMarketCap } from "./market.mapper";

const cmc = CmcListings.parse(listings).data;
const assets = cmc.map(fromCoinMarketCap);

describe("fromCoinMarketCap — same domain shape as CoinGecko (spec 6: no UI change on swap)", () => {
  it("maps price, market cap, rank and 24h change", () => {
    expect(assets[0]).toMatchObject({
      id: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      rank: 1,
      priceUsd: cmc[0]!.quote.USD.price,
      marketCapUsd: cmc[0]!.quote.USD.market_cap,
      change24hPct: cmc[0]!.quote.USD.percent_change_24h,
    });
  });

  it("uses CoinGecko ids, so coin links and saved watchlists keep working", () => {
    const ids = new Set(assets.map((a) => a.id));
    expect(ids.has("binancecoin")).toBe(true);
    expect(ids.has("ripple")).toBe(true);
    expect(ids.has("bnb")).toBe(false);
    const cgIds = new Set(CgMarkets.parse(cgMarkets).map((c) => c.id));
    const shared = assets.filter((a) => cgIds.has(a.id)).length;
    expect(shared).toBeGreaterThanOrEqual(40);
    expect(COIN_WHITELIST.filter((id) => ids.has(id)).length).toBeGreaterThanOrEqual(9);
  });

  it("has no sparkline (the listing carries none) and uses CoinMarketCap's icon", () => {
    expect(assets[0]!.sparkline7d).toEqual([]);
    expect(assets[0]!.imageUrl).toBe("https://s2.coinmarketcap.com/static/img/coins/64x64/1.png");
  });

  it("missing rank becomes 0, as with CoinGecko", () => {
    expect(fromCoinMarketCap({ ...cmc[0]!, cmc_rank: null }).rank).toBe(0);
  });
});
