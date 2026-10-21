# ADR 0002 — Redis as shared cache and centralized quota counter

- Status: Accepted
- Date: 2026-10-21

## Context

Serverless instances run in parallel and are short-lived. Next.js' built-in data cache is
per-deployment and cannot provide atomic, global counters or locks, so two instances could
both "see" budget left and both call the provider.

## Decision

Use a serverless Redis (Upstash) through a small `KeyValueStore` contract
(`src/infra/store.ts`): `get`, `set` (with `px`, `nx`), `incr` (with `EXPIRE … NX`), `decr`,
`del`. Production binds it to Redis over Upstash's REST protocol (`src/infra/redis.ts`);
tests and zero-setup dev bind it to an in-memory implementation with an injectable clock.

- Quota: `INCR` first, `DECR` if over the cap — reservation is atomic across instances.
- Single-flight: `SET lock:<key> NX PX`; losers serve stale data.
- Circuit breaker and 429 cooldowns are Redis keys with expiry.
- Local/CI integration tests hit real Redis through `serverless-redis-http` (docker compose
  service `redis-http`), so they exercise the same REST protocol as production.

## Consequences

- One contract test suite (`tests/integration/store-contract.test.ts`) runs against both
  implementations, keeping them behaviorally identical.
- Each request costs a few Redis commands; Upstash free tier must be watched on `/status`.
- Lock release is get-compare-del (not a Lua script); a lock that expires mid-call can, in a
  rare race, be released by its next owner — acceptable because the lock only prevents
  stampedes, it does not guard correctness.
