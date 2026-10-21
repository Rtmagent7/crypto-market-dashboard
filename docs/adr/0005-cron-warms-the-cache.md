# ADR 0005 — GitHub Actions cron warms the cache

- Status: Accepted
- Date: 2026-10-22

## Context

Every widget reads the shared Redis cache and only refreshes from a provider when its TTL has
passed. With no visitors for a while, the first visitor afterwards would wait for the provider
(and for Twelve Data, a cold start needs several minutes because only one 8-credit batch fits per
minute). Relying on visitor-triggered refreshes only also makes call timing unpredictable.

## Decision

`.github/workflows/warm-cache.yml` calls `POST /api/cron/warm?scope=…` on a fixed schedule:
market every 15 min, stock quotes at :00/:20/:40 on weekdays, hourly stock bars at :05, daily
bars at 21:20 UTC, FX every 6 h, the AI brief every 3 h. The route is protected by
`CRON_SECRET` (constant-time compare) and warms through the normal services, i.e. through
`callWithBudget`, so it obeys every cap. Two failed runs in a row send an alert.

## Consequences

- The schedule is visible and auditable in the repo; changing it is a reviewed PR.
- GitHub may start scheduled runs a few minutes late. That is safe: stale data is served meanwhile
  and labeled with its age.
- Rejected: Vercel Cron (Hobby plan limits frequency to once a day) and visitor-only refresh.
