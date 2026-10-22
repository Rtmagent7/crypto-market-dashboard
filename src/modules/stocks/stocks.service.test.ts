import { describe, expect, it, vi } from "vitest";

import { TICKERS } from "@/config/tickers";
import { FhMarketStatus, FhQuote } from "@/infra/providers/finnhub.schema";
import { TdQuoteBatch, TdSeriesBatch } from "@/infra/providers/twelvedata.schema";

import fhStatus from "../../../tests/fixtures/finnhub-market-status.json";
import fhQuote from "../../../tests/fixtures/finnhub-quote.json";
import quote from "../../../tests/fixtures/twelvedata-quote.json";
import daily from "../../../tests/fixtures/twelvedata-time-series-1day.json";
import hourly from "../../../tests/fixtures/twelvedata-time-series-1h.json";

import type { BudgetResult, StocksRepository } from "./stocks.repository";
import { createStocksService } from "./stocks.service";

const NOW = Date.parse("2026-10-21T16:00:00Z");
const fresh = <T>(data: T): BudgetResult<T> => ({
  status: "fresh",
  data,
  fetchedAt: NOW,
  expiresAt: NOW + 600_000,
  cacheHit: false,
});

const noBackup = { status: "unavailable", reason: "not-configured" } as const;
const finnhubBatch = {
  status: FhMarketStatus.parse(fhStatus),
  quotes: Object.fromEntries(TICKERS.map((t) => [t, FhQuote.parse(fhQuote)])),
};

const repo = (overrides: Partial<StocksRepository> = {}): StocksRepository => ({
  quotes: vi.fn(async () => fresh(TdQuoteBatch.parse(quote))),
  hourly: vi.fn(async () => fresh(TdSeriesBatch.parse(hourly))),
  daily: vi.fn(async () => fresh(TdSeriesBatch.parse(daily))),
  finnhubQuotes: vi.fn(async () => fresh(finnhubBatch)),
  ...overrides,
});

describe("stocks service", () => {
  it("returns the 8-ticker watchlist from Twelve Data", async () => {
    const env = await createStocksService({ repository: repo(), now: () => NOW }).getQuotes();
    expect(env).toMatchObject({ status: "fresh", source: "twelvedata" });
    expect(env.data?.map((q) => q.symbol)).toEqual([
      "AAPL",
      "MSFT",
      "NVDA",
      "GOOGL",
      "AMZN",
      "META",
      "TSLA",
      "SPY",
    ]);
  });

  it("returns hourly (1d) and daily (1y) series per ticker", async () => {
    const service = createStocksService({ repository: repo(), now: () => NOW });
    const [day, year] = await Promise.all([service.getSeries("1d"), service.getSeries("1y")]);
    expect(day.data?.AAPL).toHaveLength(24);
    expect(year.data?.SPY).toHaveLength(252);
  });

  it("is unavailable when quotes were never fetched and no backup is configured", async () => {
    const env = await createStocksService({
      repository: repo({
        quotes: vi.fn(async () => ({
          status: "unavailable" as const,
          reason: "budget-exhausted" as const,
        })),
        finnhubQuotes: vi.fn(async () => noBackup),
      }),
      now: () => NOW,
    }).getQuotes();
    expect(env).toMatchObject({ status: "unavailable", data: null });
  });
});

describe("stocks cache policy follows is_market_open and the batch schedule", () => {
  it("open: quotes expire at the next :00/:20/:40 slot", async () => {
    const { quotePolicy } = await import("./stocks.repository");
    expect(quotePolicy(TdQuoteBatch.parse(quote), Date.parse("2026-10-21T14:07:00Z")).ttl).toBe(
      13 * 60,
    );
  });

  it("closed: quotes keep until shortly after the next open, never past 6 h", async () => {
    const { quotePolicy } = await import("./stocks.repository");
    const closed = TdQuoteBatch.parse(
      Object.fromEntries(
        Object.entries(quote).map(([k, v]) => [k, { ...v, is_market_open: false }]),
      ),
    );
    // Wednesday 22:00 UTC (18:00 New York): next open is 13:30 UTC the next day, 15.5 h away.
    expect(quotePolicy(closed, Date.parse("2026-10-21T22:00:00Z")).ttl).toBe(6 * 3_600);
    // Thursday 13:00 UTC (09:00 New York): 30 min before the open → refresh just after it.
    expect(quotePolicy(closed, Date.parse("2026-10-22T13:00:00Z")).ttl).toBe(31 * 60);
  });
});

describe("stocks service — Finnhub fallback for quotes (spec 10.2)", () => {
  const failed = { status: "unavailable", reason: "provider-error" } as const;

  it("never calls Finnhub while Twelve Data is fresh", async () => {
    const repository = repo();
    await createStocksService({ repository, now: () => NOW }).getQuotes();
    expect(repository.finnhubQuotes).not.toHaveBeenCalled();
  });

  it("serves Finnhub quotes, and names it, when Twelve Data has nothing", async () => {
    const env = await createStocksService({
      repository: repo({ quotes: vi.fn(async () => failed) }),
      now: () => NOW,
    }).getQuotes();
    expect(env).toMatchObject({ status: "fresh", source: "finnhub" });
    expect(env.data).toHaveLength(8);
  });

  it("charts stay on Twelve Data: Finnhub is a quotes-only backup (spec 10.2)", async () => {
    const repository = repo({ hourly: vi.fn(async () => failed) });
    const env = await createStocksService({ repository, now: () => NOW }).getSeries("1d");
    expect(env).toMatchObject({ status: "unavailable", source: "twelvedata" });
    expect(repository.finnhubQuotes).not.toHaveBeenCalled();
  });
});
