/** 8-ticker US watchlist (spec Section 3). Twelve Data free tier covers US markets only. */
export const TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "SPY"] as const;

export type Ticker = (typeof TICKERS)[number];

/** Display names, as Twelve Data reports them (tests/fixtures/twelvedata-quote.json). Finnhub's
 * /quote has no name, so its fallback uses these. */
export const TICKER_NAMES: Readonly<Record<Ticker, string>> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corporation Common Stock",
  NVDA: "NVIDIA Corporation",
  GOOGL: "Alphabet Inc. Class A Common Stock",
  AMZN: "Amazon.com Inc.",
  META: "Meta Platforms Inc. Class A Common Stock",
  TSLA: "Tesla, Inc.",
  SPY: "State Street SPDR S&P 500 ETF Trust",
};
