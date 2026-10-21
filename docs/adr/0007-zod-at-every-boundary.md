# ADR 0007 — Zod validation at every boundary

- Status: Accepted
- Date: 2026-10-22

## Context

TypeScript types vanish at runtime. Providers change formats without notice (Twelve Data sends
numbers as strings and reports some errors inside HTTP 200 bodies; CoinGecko once reported a 24 h
volume 10⁵× the market cap). Route parameters are attacker-controlled.

## Decision

Three schema sets, at three boundaries:

1. **Environment** (`infra/env.ts`): the app refuses to start misconfigured and lists every problem.
2. **Provider responses** (`infra/providers/*.schema.ts`): built from real captured fixtures, never
   docs alone. A mismatch is a `ContractError`: logged, alerted, never retried, and the fallback
   path serves — broken data never reaches the UI.
3. **Route input** (`params.ts`, cron `auth.ts`): whitelists checked before any cache or provider
   access (cache-key explosion protection).

The public HTTP contract is a fourth Zod set (`app/api/_lib/contract.ts`) that generates
`docs/openapi.yaml` and has a compile-time equality check against the domain model.

## Consequences

- Schema tests run against the fixtures; when a provider changes, recapture the fixture and the
  failing test points at the field.
- Sanity checks beyond types live in mappers (e.g. implausible volume → `null`).
