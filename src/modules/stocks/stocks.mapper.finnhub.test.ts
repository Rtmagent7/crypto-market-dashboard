import { describe, expect, it } from "vitest";

import { TICKERS } from "@/config/tickers";
import { FhMarketStatus, FhQuote, type FhBatch } from "@/infra/providers/finnhub.schema";

import status from "../../../tests/fixtures/finnhub-market-status.json";
import unknown from "../../../tests/fixtures/finnhub-quote-unknown.json";
import quote from "../../../tests/fixtures/finnhub-quote.json";

import { fromFinnhub } from "./stocks.mapper";

const q = FhQuote.parse(quote);
const batch = (overrides: Partial<FhBatch["quotes"]> = {}, isOpen = false): FhBatch => ({
  status: { ...FhMarketStatus.parse(status), isOpen },
  quotes: { ...Object.fromEntries(TICKERS.map((s) => [s, q])), ...overrides },
});

describe("fromFinnhub — same StockQuote shape as Twelve Data", () => {
  it("maps every ticker in watchlist order with the configured name", () => {
    const out = fromFinnhub(batch(), TICKERS);
    expect(out.map((s) => s.symbol)).toEqual([...TICKERS]);
    expect(out[0]).toMatchObject({
      symbol: "AAPL",
      name: "Apple Inc.",
      price: q.c,
      change: q.d,
      changePct: q.dp,
      asOf: new Date(q.t * 1000).toISOString(),
    });
  });

  it("the session flag comes from Finnhub's market status, not from our clock", () => {
    expect(fromFinnhub(batch({}, true), TICKERS)[0]!.isMarketOpen).toBe(true);
    expect(fromFinnhub(batch({}, false), TICKERS)[0]!.isMarketOpen).toBe(false);
  });

  it("leaves out symbols Finnhub does not know (c = 0, t = 0) or did not return", () => {
    const partial = batch({ NVDA: FhQuote.parse(unknown) });
    delete (partial.quotes as Record<string, unknown>).SPY;
    const out = fromFinnhub(partial, TICKERS);
    expect(out.map((s) => s.symbol)).not.toContain("NVDA");
    expect(out.map((s) => s.symbol)).not.toContain("SPY");
    expect(out).toHaveLength(6);
  });
});
