# CLAUDE.md — crypto-market-dashboard

Condensed from the build brief (`P1Dashbord.md`, Sections 0, 0A, 0B, 7, 9A, 14).
Every Claude Code session in this repo starts with these constraints.

@AGENTS.md

## Priorities

correctness → quota safety → security → performance → polish.

## Working rules (non-negotiable)

1. Work phase by phase; each phase ends at a **Gate**. Report done / gate status / blockers.
2. **Never call real providers from tests or local dev.** MSW + real fixtures; `MOCK_PROVIDERS=1`.
3. **Every outbound provider call goes through `callWithBudget`.** Enforced by ESLint.
4. TypeScript strict, **zero `any`**, explicit return types on exported functions, hooks and
   route handlers; discriminated unions for conditional state.
5. **TDD** for business logic (`callWithBudget`, services, TTL logic, mappers): `test:` commit
   before `feat:`.
6. Small atomic Conventional Commits; PRs < 400 lines.
7. TTLs and caps live **only** in `src/config/cache-policy.ts` and `src/infra/outbound/budgets.ts`.
8. Architectural change not in the brief → ADR in `docs/adr/` **and ask first**.
9. Missing key or fixture → **stop and ask**. Zod schemas match real responses, not docs.
10. Frontend follows the Tidewater spec below exactly.

## Next.js 16 notes (this repo)

- `cacheComponents` + `partialPrefetching` are on. Route-segment `revalidate`/`dynamic` do
  not exist; data lifetimes use `'use cache'` + `cacheLife()` (ADR 0009).
- Read `node_modules/next/dist/docs/` before using an API you are unsure about.
- `npm run typecheck` runs `next typegen` first (route types for `PageProps`/`LayoutProps`).
- MSW v3: the option is `onUnhandledFrame` (`onUnhandledRequest` is silently ignored).
- Tests use `setupProviderMocks()` from `tests/msw/server.ts`; real Redis tests need
  `TEST_REDIS_URL`/`TEST_REDIS_TOKEN` (`docker compose up -d redis-http`).
- Recapture fixtures with `npm run fixtures:capture` (calls each endpoint once; ask first).

## Layer rules (Section 7)

```
app/ (pages, /api/* handlers)  → controller: parse input, call service, return DataEnvelope<T>
modules/*/*.service.ts          → pure logic: provider selection, fallback, TTL (no Next/React)
modules/*/*.repository.ts       → the ONLY caller of callWithBudget
infra/outbound/                 → callWithBudget, budgets, day-key, errors (Redis)
infra/providers/*               → HTTP + Zod only, imports `server-only`, HTTPS only
```

- UI (`components/`, `hooks/`, `stores/`, pages) never imports `@/infra/*`.
- Every `/api/*` route returns `DataEnvelope<T>`, no exceptions; params validated against
  Zod whitelists (out-of-whitelist → 400, provider not called).
- ESLint `no-restricted-imports` encodes these rules — do not disable it.

## Skill status (Section 0B) — build only ✅; 🟡 needs explicit approval after Gate 6

✅ Semantic HTML, WCAG 2.2 AA, Grid/Flexbox, container queries, async JS, closures, event
delegation, TS generics/utility types/strict, React RSC, App Router, dynamic routes, SSR,
SSG/ISR, Zustand, Context (providers only), TanStack Query, optimistic UI, Tailwind,
shadcn/ui, Core Web Vitals, code splitting, next/image, Turbopack, Vitest, Playwright, TDD,
REST (naming, status codes, rate limiting), Zod, OpenAPI, SSE/streaming, Redis (cache, rate
limit, counters, locks), Vercel, Docker multi-stage, docker-compose, GitHub Actions, OWASP
mitigations, LLM integration (Groq + Workers AI), trunk-based git, ADRs, English docs.

🟡 PostgreSQL + Drizzle status history (S1), Terraform (S2), `/docs/api` reference page (S3).

⛔ Everything else (Vue/Angular, Redux, SWR, CSS-in-JS, MUI, Express/Nest, GraphQL,
WebSockets, auth, pagination, K8s, AWS/GCP, Jest/Cypress, paid LLM APIs, LangChain, RAG…).
Reasons go in `docs/adr/0008-scope-of-technology.md`. Never add a ⛔ technology.

## Tidewater design tokens (Section 9A)

- Tokens are defined **only** in `src/app/globals.css`. Components use utilities
  (`bg-surface`, `text-muted`, `text-up`, `text-down`, `text-stale`, `text-accent`,
  `bg-skeleton`, `border-control-border`, `rounded-panel`, `rounded-control`).
  **No raw hex in `src/components`** (`npm run check:tokens` in CI).
- Color has meaning or is not used: mint `up`, coral `down`, amber `stale`, violet `accent`
  (interactive/focus). No gradients, glow, glass, neon, all-caps eyebrows.
- Dark is default (follows `prefers-color-scheme`); user choice → `<html data-theme>`.
- Type: IBM Plex Sans 400/500/600 (UI, figures, tabular nums) + IBM Plex Sans Condensed
  500/600 (`font-condensed`: pulse figures, table headers). Scale: `text-pulse`,
  `text-page-title`, `text-panel-title`, `text-cell`, `text-meta`. Sentence case.
- Use `cn` from `@/lib/utils` (knows the custom scale), never `from "cn"` directly.
- 4 px grid; panel padding 16 (20 ≥ 1280); gap 16; radius: shell 0, panel 10, control 6,
  badges full. Elevation in dark = surface lightness, not shadows.
- Layout: desktop ≥ 1280 72 px nav rail (→ 220 on hover/focus), tablet top bar, mobile
  bottom tab bar; Overview grid areas `pulse / table / brief / trending / fx`.
- Every data panel: Freshness Rail (2 px, `scaleX`, accent → stale) + "Updated … · Source".
- Up/down never by color alone: ▲/▼ and +/− (U+2212). Tap targets ≥ 44 px. Inline links
  underlined. Motion only inside `prefers-reduced-motion: no-preference`.

## Definition of Done (Section 14)

- [ ] Zod schema from a real fixture
- [ ] External calls via `callWithBudget`; TTL from `config/cache-policy.ts`
- [ ] Route returns `DataEnvelope<T>`, params validated against whitelist
- [ ] Widget has loading / fresh / stale / unavailable; skeleton height = content height
- [ ] Tokens only, Freshness Rail + source meta, matches 9A at 390 / 768 / 1440 in both themes
- [ ] New `/api/*` route in `docs/openapi.yaml`
- [ ] Unit + integration tests pass; module coverage ≥ 80% (`callWithBudget` ≥ 90%)
- [ ] Quota compliance test for any new endpoint
- [ ] axe: 0 serious/critical
- [ ] Calibration table updated if an endpoint or TTL changed
- [ ] PR < 400 lines, Conventional Commit title, CI green

## Commands

`npm run dev` · `lint` · `format:check` · `typecheck` · `test` · `test:coverage` ·
`check:tokens` · `build` · `test:e2e` · `analyze` · `docker compose up redis`
