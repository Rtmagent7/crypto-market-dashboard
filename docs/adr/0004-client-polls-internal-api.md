# ADR 0004 — The client polls the internal /api/*, not providers or WebSockets

- Status: Accepted
- Date: 2026-10-21

## Context

Data changes every 15–20 minutes at best (free-tier TTLs). Streaming transports would keep
connections open for values that rarely change, and serverless platforms bill for them.

## Decision

First render is server-rendered from cache. Afterwards TanStack Query polls internal
`/api/*` routes, with `staleTime`/`refetchInterval` derived from the envelope's
`nextRefreshAt`, and `refetchIntervalInBackground: false`. No WebSockets or SSE for prices
(SSE is used only for streaming AI text).

## Consequences

- Polling costs zero provider quota: `/api/*` reads the shared cache.
- Clients never ask more often than data can change.
- Per-IP rate limiting on `/api/*` (Phase 4) bounds function and Redis usage.
