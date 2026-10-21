import { describe, expect, it } from "vitest";

import { TdQuoteBatch, TdSeriesBatch } from "@/infra/providers/twelvedata.schema";

import quote from "../../../tests/fixtures/twelvedata-quote.json";
import daily from "../../../tests/fixtures/twelvedata-time-series-1day.json";
import hourly from "../../../tests/fixtures/twelvedata-time-series-1h.json";

import { fromTwelveDataQuotes, fromTwelveDataSeries } from "./stocks.mapper";

describe("stocks mappers", () => {
  it("maps quotes into StockQuote in watchlist order, skipping failed symbols", () => {
    const batch = TdQuoteBatch.parse({
      ...quote,
      XYZ: { code: 404, message: "nope", status: "error" },
    });
    const quotes = fromTwelveDataQuotes(batch, ["SPY", "AAPL", "XYZ"]);
    expect(quotes.map((q) => q.symbol)).toEqual(["SPY", "AAPL"]);
    expect(quotes[1]).toMatchObject({
      symbol: "AAPL",
      name: expect.any(String),
      price: expect.any(Number),
      change: expect.any(Number),
      changePct: expect.any(Number),
      isMarketOpen: true,
      asOf: expect.stringMatching(/Z$/),
    });
  });

  it("hourly series → UTC times from the exchange time zone, oldest first", () => {
    const series = fromTwelveDataSeries(TdSeriesBatch.parse(hourly));
    const aapl = series.AAPL!;
    expect(aapl).toHaveLength(24);
    expect(aapl[0]!.t < aapl.at(-1)!.t).toBe(true);
    expect(aapl.at(-1)!.t).toBe("2026-10-21T15:30:00.000Z"); // 11:30 New York (EDT)
  });

  it("daily series keeps business-day dates", () => {
    const spy = fromTwelveDataSeries(TdSeriesBatch.parse(daily)).SPY!;
    expect(spy).toHaveLength(252);
    expect(spy.at(-1)!.t).toBe("2026-10-21");
  });
});
