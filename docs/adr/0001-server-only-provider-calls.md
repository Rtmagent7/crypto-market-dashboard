# ADR 0001 — All provider calls are server-side only

- Status: Accepted
- Date: 2026-10-21

## Context

Every data source (CoinGecko, Twelve Data, Frankfurter, Groq, backups) has a free-tier quota
and most need a secret key. If browsers called providers directly, keys would ship in the
bundle and call volume would grow with every open tab.

## Decision

Browsers and cron only talk to this Next.js app. Provider modules live in `src/infra/providers/`,
import `server-only`, and are reachable only from `modules/*/*.repository.ts` through
`callWithBudget` (enforced by ESLint `no-restricted-imports`). Keys are server env only —
never `NEXT_PUBLIC_`.

## Consequences

- Keys never reach the client; one shared cache serves every visitor.
- Provider volume = f(cache TTL), independent of traffic (proved by
  `tests/integration/quota-coingecko-markets.test.ts`).
- The app becomes the single point of failure for data, hence stale-serving and fallbacks.
