// Per-provider caps — single source of truth (spec Section 10.1).
// cap = 80% of the official limit. Reset zones verified 2026-10-21:
// - twelvedata: daily credits reset 00:00 UTC (Twelve Data support article "Credits").
// - coingecko / others: not documented publicly → UTC remains an ASSUMPTION; confirm with
//   response headers once real keys exist (scripts/capture-fixtures.mts stores them).

export type BudgetPeriod = "day" | "month";

export interface Budget {
  readonly period: BudgetPeriod;
  readonly cap: number;
  readonly perMinute: number;
  readonly resetTz: string;
}

export const BUDGETS = {
  coingecko: { period: "month", cap: 8_000, perMinute: 24, resetTz: "UTC" },
  coinmarketcap: { period: "month", cap: 8_000, perMinute: 24, resetTz: "UTC" },
  twelvedata: { period: "day", cap: 640, perMinute: 8, resetTz: "UTC" },
  finnhub: { period: "day", cap: 250, perMinute: 48, resetTz: "UTC" },
  frankfurter: { period: "day", cap: 500, perMinute: 10, resetTz: "UTC" },
  exchangerate: { period: "month", cap: 1_200, perMinute: 5, resetTz: "UTC" },
  "groq:summary": { period: "day", cap: 800, perMinute: 24, resetTz: "UTC" },
  "groq:chat": { period: "day", cap: 100, perMinute: 10, resetTz: "UTC" },
  "workers-ai": { period: "day", cap: 40, perMinute: 10, resetTz: "UTC" },
} as const satisfies Record<string, Budget>;

export type BudgetKey = keyof typeof BUDGETS;

/** Resilience knobs (spec Section 10.3). */
export const RESILIENCE = {
  timeoutMs: 8_000,
  retryDelaysMs: [500, 1_500],
  retryJitterMs: 250,
  lockMs: 15_000,
  /** With no cache yet, a concurrent request waits this long for the in-flight call. */
  lockWaitMs: 2_000,
  lockPollMs: 100,
  breakerThreshold: 5,
  breakerWindowSeconds: 300,
  breakerOpenSeconds: 600,
} as const;

/** Quota alerts fire once per period when usage crosses these shares of the cap (spec §10.5). */
export const ALERT_THRESHOLDS_PCT = [70, 90] as const;
