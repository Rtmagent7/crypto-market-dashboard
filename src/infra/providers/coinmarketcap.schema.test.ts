import { describe, expect, it } from "vitest";

import listings from "../../../tests/fixtures/coinmarketcap-listings.json";

import { CmcListings } from "./coinmarketcap.schema";

describe("CoinMarketCap schema matches the real fixture", () => {
  it("/listings/latest: 50 coins ranked by market cap with a USD quote", () => {
    const parsed = CmcListings.parse(listings);
    expect(parsed.status.error_code).toBe(0);
    expect(parsed.data).toHaveLength(50);
    expect(parsed.data[0]).toMatchObject({ slug: "bitcoin", symbol: "BTC", cmc_rank: 1 });
    expect(parsed.data[0]!.quote.USD.price).toBeGreaterThan(1_000);
  });
});
