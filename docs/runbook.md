# Runbook

How to operate Tidewater after launch (spec Phase 7). Production:
<https://crypto-market-dashboard-beige.vercel.app> · Status: `/status`.

## Routine

| When                 | Do                                                                                                                                                                                                                                            |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weekly               | Open `/status`: every core provider Operational, quota meters below the 70% tick. Merge green Dependabot PRs (CI + E2E + Lighthouse must pass; read changelogs of major bumps).                                                               |
| Monthly              | Check each provider's pricing page for free-tier changes (CoinGecko, Twelve Data, Frankfurter, Groq, World Bank, Upstash). Update `src/infra/outbound/budgets.ts` (caps = 80% of the official limit) and the calibration table in the README. |
| After any TTL change | Rerun `npm test` — the quota-compliance tests recompute the expected calls per day.                                                                                                                                                           |

## Alerts and what to do

| Alert                                    | Meaning                                                      | Action                                                                                                                                                                                |
| :--------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<provider> used 70% of its quota`       | On track to hit the cap                                      | Raise that endpoint's TTL in `src/config/cache-policy.ts`, record why in a new ADR, deploy.                                                                                           |
| `<provider> used 90% of its quota`       | Cap (80% of the real limit) is close                         | Same as above, today. The guard will stop calls at the cap and serve stale data — users see amber "Data as of …" badges, not errors.                                                  |
| `Circuit breaker opened for <provider>`  | 5 consecutive failures                                       | Check the provider's status page. Nothing to do if it recovers: the breaker closes after 10 min and backups/stale data serve meanwhile.                                               |
| `<provider> changed its response format` | Zod contract error                                           | 1. `npm run fixtures:capture` (calls each endpoint once). 2. Run `npm test`: the failing schema test names the field. 3. Update `*.schema.ts` and the mapper. 4. Ship as a `fix:` PR. |
| `warm-cache failed twice in a row`       | Cron cannot reach production, or every warm returned nothing | Open the failed run's log. 401 → `CRON_SECRET` differs between Vercel and GitHub secrets (rotate both). 5xx → check Vercel function logs and `/status`.                               |

## Provider down for a long time

Confirm on `/status` that the fallback is serving ("… serving" in the Fallback column). If a core
provider is down for more than 7 days, evaluate replacing it through a new ADR; the mapper layer
means only `infra/providers/*` and the mapper change, never the UI.

## Rotating secrets

| Secret                                                                             | Where it lives                                                                      | Steps                                                                                                                                    |
| :--------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| Provider keys (`COINGECKO_API_KEY`, `TWELVEDATA_API_KEY`, `GROQ_API_KEY`, backups) | Vercel env (Production + Preview, sensitive), `.env.local` for fixture capture      | Create a new key at the provider → `vercel env add NAME production --sensitive --force` (and `preview`) → redeploy → revoke the old key. |
| `CRON_SECRET`                                                                      | Vercel env (per environment) + GitHub secrets `CRON_SECRET` / `CRON_SECRET_PREVIEW` | Generate with `openssl rand -hex 32`, set both places in the same minute, run the warm-cache workflow manually to verify.                |
| `IP_HASH_SALT`                                                                     | Vercel env                                                                          | Rotate freely; rate-limit windows simply restart.                                                                                        |
| Redis (`KV_REST_API_*`)                                                            | Injected by the Upstash Marketplace integration                                     | Rotate in the Upstash dashboard; Vercel picks up the new token.                                                                          |

## Deploys and rollback

Every merge to `main` deploys Production automatically; every PR gets a Preview (10% budget
caps, separate cache namespace, same quota counters). Roll back from the Vercel dashboard
(_Instant Rollback_) or `vercel rollback`. Cached data survives deploys.

## Local development

`cp .env.example .env.local`, keep `MOCK_PROVIDERS=1`, `npm run dev`. Mock mode serves the real
captured fixtures through MSW and an in-memory store: zero provider calls, no keys needed.
