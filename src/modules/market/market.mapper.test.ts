import { describe, expect, it } from "vitest";

import { CgGlobal, CgMarkets, CgTrending } from "@/infra/providers/coingecko.schema";

import global from "../../../tests/fixtures/coingecko-global.json";
import markets from "../../../tests/fixtures/coingecko-markets.json";
import trending from "../../../tests/fixtures/coingecko-trending.json";

import { fromCoinGecko, fromCoinGeckoGlobal, fromCoinGeckoTrending } from "./market.mapper";

const items = CgMarkets.parse(markets);
const first = items[0]!;

describe("fromCoinGecko (spec 6.3)", () => {
  it("maps a market item to the provider-agnostic CryptoAsset", () => {
    expect(fromCoinGecko(first)).toEqual({
      id: first.id,
      symbol: first.symbol.toUpperCase(),
      name: first.name,
      imageUrl: first.image,
      priceUsd: first.current_price,
      marketCapUsd: first.market_cap,
      rank: first.market_cap_rank,
      change24hPct: first.price_change_percentage_24h,
      sparkline7d: first.sparkline_in_7d?.price,
    });
  });

  it("falls back to rank 0 and an empty sparkline when the provider omits them", () => {
    const asset = fromCoinGecko({ ...first, sparkline_in_7d: undefined, market_cap_rank: null });
    expect(asset.rank).toBe(0);
    expect(asset.sparkline7d).toEqual([]);
  });

  it("maps every coin of the real top-50 fixture", () => {
    const assets = items.map(fromCoinGecko);
    expect(assets).toHaveLength(50);
    expect(assets.every((a) => a.symbol === a.symbol.toUpperCase())).toBe(true);
  });
});

describe("fromCoinGeckoGlobal", () => {
  const parsed = CgGlobal.parse(global);

  it("maps market cap, 24h change and BTC dominance", () => {
    const g = fromCoinGeckoGlobal(parsed);
    expect(g.totalMarketCapUsd).toBe(parsed.data.total_market_cap.usd);
    expect(g.marketCapChange24hPct).toBe(parsed.data.market_cap_change_percentage_24h_usd);
    expect(g.btcDominancePct).toBe(parsed.data.market_cap_percentage.btc);
  });

  it("drops an implausible 24h volume instead of showing it", () => {
    // Seen live on 2026-10-21: the public /global endpoint reported ~2.9e17 USD volume
    // against a ~2.8e12 USD market cap. The Demo-key capture a few minutes later was sane.
    const glitch = structuredClone(parsed);
    glitch.data.total_volume.usd = 2.94e17;
    expect(fromCoinGeckoGlobal(glitch).volume24hUsd).toBeNull();
  });

  it("keeps the plausible 24h volume from the real fixture", () => {
    expect(fromCoinGeckoGlobal(parsed).volume24hUsd).toBe(parsed.data.total_volume.usd);
  });
});

describe("fromCoinGeckoTrending", () => {
  it("maps trending coins with their USD 24h change", () => {
    const coins = fromCoinGeckoTrending(CgTrending.parse(trending));
    expect(coins.length).toBeGreaterThan(0);
    expect(coins[0]).toMatchObject({
      id: expect.any(String),
      symbol: expect.stringMatching(/^[A-Z0-9]+$/),
      thumbUrl: expect.stringMatching(/^https:\/\//),
      priceUsd: expect.any(Number),
    });
  });

  it("caps the list at the 5 rows the panel shows", () => {
    expect(fromCoinGeckoTrending(CgTrending.parse(trending)).length).toBeLessThanOrEqual(5);
  });
});
