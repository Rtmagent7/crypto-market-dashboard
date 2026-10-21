/** 8-ticker US watchlist (spec Section 3). Twelve Data free tier covers US markets only. */
export const TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "SPY"] as const;

export type Ticker = (typeof TICKERS)[number];
