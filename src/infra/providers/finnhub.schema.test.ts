import { describe, expect, it } from "vitest";

import status from "../../../tests/fixtures/finnhub-market-status.json";
import unknown from "../../../tests/fixtures/finnhub-quote-unknown.json";
import quote from "../../../tests/fixtures/finnhub-quote.json";

import { FhMarketStatus, FhQuote } from "./finnhub.schema";

describe("Finnhub schemas match real fixtures", () => {
  it("/quote: price, change and percent change with a unix timestamp", () => {
    const q = FhQuote.parse(quote);
    expect(q.c).toBeGreaterThan(0);
    expect(q.t).toBeGreaterThan(1_700_000_000);
  });

  it("/quote for an unknown symbol is still 200: zeros and null changes", () => {
    expect(FhQuote.parse(unknown)).toMatchObject({ c: 0, d: null, dp: null, t: 0 });
  });

  it("/stock/market-status: the session flag comes from the provider, not our clock", () => {
    expect(FhMarketStatus.parse(status)).toMatchObject({ exchange: "US", isOpen: false });
  });
});
