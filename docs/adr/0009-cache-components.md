# ADR 0009 — Use Next.js 16 Cache Components instead of route-segment `revalidate`

- Status: Accepted (owner delegated the decision, 2026-10-21)
- Date: 2026-10-21

## Context

The brief (Sections 3, 8) specifies ISR through route-segment `export const revalidate = N`
and `generateStaticParams`. The project was scaffolded with Next.js 16.4, whose default
template enables `cacheComponents` and `partialPrefetching`. With Cache Components on,
`revalidate`, `dynamic`, `dynamicParams` and `fetchCache` segment exports are **removed**;
lifetimes are declared per cached scope with `'use cache'` + `cacheLife({ stale, revalidate,
expire })`, and request-time rendering is opted into with `await connection()`.

## Decision

Keep Cache Components. Map the brief's rendering table as follows:

| Brief                                 | Cache Components equivalent                                                |
| :------------------------------------ | :------------------------------------------------------------------------- |
| Overview `revalidate 900`             | Server data function with `'use cache'` + `cacheLife({ revalidate: 900 })` |
| Global/trending `revalidate 3600`     | same, `revalidate: 3600`                                                   |
| FX `revalidate 21600`                 | same, `revalidate: 21600`                                                  |
| `/coins/[id]` on-demand ISR, 10 coins | `generateStaticParams` (whitelist) + `params` awaited inside `<Suspense>`  |
| `/status` `no-store`                  | `await connection()` inside a Suspense boundary                            |

The seconds still come from `config/cache-policy.ts` — `cacheLife` reads those constants, so
the "TTLs in exactly two files" rule holds. Redis (`callWithBudget`) stays the source of
truth for provider freshness; the Next.js cache only avoids re-rendering.

## Consequences

- Each widget becomes its own cached, streamable scope — a natural fit for "Suspense per
  widget" in Section 8.
- Reviewers reading the brief will look for `export const revalidate`; this ADR explains why
  it is absent.
- Alternative if rejected: set `cacheComponents: false` and use the previous caching model
  exactly as the brief describes. Nothing in Phase 1 depends on either choice.

## Amendment (2026-10-22, Overview with live data)

Implementation showed that `'use cache'` on data functions runs during prerendering, i.e.
inside `next build` — on Vercel that spends real quota, and in CI (`MOCK_PROVIDERS=1`, no
MSW during build) it would reach real providers, breaking the "never call providers from
CI" rule. Data widgets therefore:

1. call `await connection()` (request-time only) and read through the service → Redis;
2. sit behind their own `<Suspense>` with a fixed-size skeleton.

The route is Partial Prerendered (◐): the shell with skeletons is static, widgets stream in
the same response. Redis (`callWithBudget`) remains the only data cache, and `/api/*`
responses use `s-maxage` so Vercel's CDN absorbs polling. `'use cache'` stays available for
data that is safe to compute at build time (none yet).
