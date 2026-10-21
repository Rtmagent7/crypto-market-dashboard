# Tidewater — crypto & market dashboard

Crypto markets, US stocks and FX rates in near-real-time, at **$0** and **never over an API
limit**. Provider call volume is set by cache TTL, not by visitor count: every outbound call
goes through one server-side gate (`callWithBudget`) backed by Redis.

> Status: **Phase 1 — scaffold & app shell.** Data modules arrive in Sprint 2.

## Stack

Next.js 16 (App Router, Cache Components, Turbopack) · TypeScript strict · Tailwind CSS v4 +
shadcn/ui · TanStack Query · Zustand · Zod · Redis · Vitest · Playwright + axe · Docker ·
GitHub Actions.

## Run locally

```bash
cp .env.example .env.local      # MOCK_PROVIDERS=1 keeps local dev at zero provider calls
npm ci
npm run dev                     # http://localhost:3000
docker compose up redis         # local Redis for integration tests
```

## Checks

```bash
npm run lint && npm run format:check && npm run typecheck && npm run check:tokens
npm test                        # Vitest
npm run build && npm run test:e2e   # Playwright + axe against the production build
```

## Docs

- `CLAUDE.md` — engineering rules for every Claude Code session
- `docs/adr/` — architecture decisions
- `docs/security.md` — security notes (OWASP mapping in Sprint 4)

Crypto data by [CoinGecko](https://www.coingecko.com/). Educational information only, not
financial advice.
