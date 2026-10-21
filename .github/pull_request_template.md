## What

<!-- One logical change. Conventional Commit title, e.g. `feat(market): top-50 coin table`. -->

## Why

Closes #

## How tested

- [ ] `npm run lint && npm run typecheck && npm test`
- [ ] Quota compliance test (if a provider endpoint was added or a TTL changed)
- [ ] E2E / axe (if UI changed)

## Screenshots

<!-- UI changes: 390 / 768 / 1440 px, light and dark. Attach the bundle-analyzer diff. -->

## Definition of Done (CLAUDE.md)

- [ ] Zod schema built from a real fixture, not docs alone
- [ ] All external calls go through `callWithBudget`; TTL from `config/cache-policy.ts`
- [ ] Route returns `DataEnvelope<T>` and validates params against the whitelist
- [ ] Widget handles all four states; skeleton height equals content height
- [ ] Tokens only (no raw hex), Freshness Rail + source meta, matches Section 9A
- [ ] New `/api/*` route documented in `docs/openapi.yaml`
- [ ] Unit + integration tests pass; module coverage ≥ 80%
- [ ] axe: 0 serious or critical violations
- [ ] Calibration table updated if an endpoint or TTL changed
- [ ] PR < 400 lines, CI green
