# ADR 0006 — Pure SVG sparklines; the detail chart is loaded on demand

- Status: Accepted
- Date: 2026-10-22

## Context

The Overview shows 50 sparklines and must render fast on phones (LCP < 2.5 s, INP < 200 ms).
Detail pages need an interactive chart with a crosshair.

## Decision

- Sparklines are a pure function (`components/charts/sparkline-path.ts`) drawing an SVG path; no
  library, server-renderable, colored from tokens, with an `aria-label` stating the 7-day trend.
  The service thins each to 42 points (one per 4 h): denser than the 96 px drawing can show.
- Detail charts use `lightweight-charts` (Apache-2.0) through `next/dynamic` with `ssr: false`,
  so the library is never in the initial bundle. Its TradingView attribution logo stays on, as the
  license requires. Colors are read from CSS tokens at render time and re-applied on theme change.
- Every chart has a text summary and a hidden first/last/low/high table for screen readers.

## Consequences

- One chart library, loaded only on `/fx`, `/coins/[id]` and `/stocks`.
- Rejected: one charting library for everything (50 canvas instances on the Overview).
