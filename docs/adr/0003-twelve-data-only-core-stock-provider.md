# ADR 0003 — Twelve Data is the only core stock provider

- Status: Accepted
- Date: 2026-10-21

## Context

Candidates were Twelve Data (800 credits/day, 8/min, US markets) and Finnhub (60/min, daily
limit reported inconsistently as 300 or 1,000). Running both in parallel doubles integration
work and schemas for no user-visible benefit.

## Decision

Twelve Data is the single core stock provider; Finnhub is an emergency backup capped at
250/day. Batches of 8 tickers (= 8 credits) are scheduled in different minutes
(quote at :00/:20/:40, intraday at :05, daily 15 min after close). TTL comes from the
response's `is_market_open`, never from the local clock. Twelve Data's daily credits reset
at 00:00 UTC (verified in its support article, 2026-10-21).

## Consequences

- One schema and mapper for the main path; ~32% of the daily allowance at peak.
- Real fixtures must be recaptured with a real key: the `demo` key only returns a single
  symbol, while an 8-symbol batch returns an object keyed by symbol.
