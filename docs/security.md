# Security

The biggest threat to this app is not data theft — there is no login and no personal data — but
someone **draining the free API quotas** or using the app as a proxy. Every control below is
implemented and tested; the file column is where a reviewer can verify it.

## OWASP Top 10 (2021 IDs) mapping

| OWASP category                             | Threat here                                 | Control                                                                                                                                                                                                                                                                                                                                                                  | Where                                                                                                                |
| :----------------------------------------- | :------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **A01 Broken Access Control**              | Outsiders triggering cache warms            | `/api/cron/warm` requires `Authorization: Bearer CRON_SECRET`, compared with `timingSafeEqual` over SHA-256 digests (no length/content leak); 401 otherwise                                                                                                                                                                                                              | `src/app/api/cron/warm/auth.ts` (+ tests), `tests/e2e/cron.spec.ts`                                                  |
| **A02 Cryptographic Failures**             | Keys or traffic exposed                     | Provider keys are server-only env (no `NEXT_PUBLIC_`), marked _sensitive_ in Vercel; Twelve Data key sent as a header, never in URLs/logs; HTTPS only (HSTS 2 y + preload); provider clients reject non-HTTPS base URLs; Redis over HTTPS (Upstash REST), enforced by `env.ts` in production                                                                             | `src/infra/env.ts`, `src/infra/providers/http.ts`, `src/config/security-headers.ts`                                  |
| **A03 Injection**                          | Cache-key explosion; prompt injection; XSS  | Every route param validated against Zod whitelists before cache or provider access (coin id → 400/404, range → 400, scope → 400); unknown coin pages rejected in `proxy.ts`; AI prompt built only from server-side structured data, never user input; AI output stripped of markdown/links and rendered as text; no `dangerouslySetInnerHTML` (ESLint `react/no-danger`) | `src/app/api/coins/[id]/chart/params.ts`, `src/proxy.ts`, `src/modules/ai/prompts.ts`, `src/modules/ai/ai.mapper.ts` |
| **A04 Insecure Design**                    | Quota exhaustion by design flaws            | Single outbound gate (`callWithBudget`) with period + per-minute caps (80% of each limit), weighted by credits, single-flight locks, circuit breaker, cooldown on 429; call volume depends on TTL, not traffic (quota-compliance tests per endpoint)                                                                                                                     | `src/infra/outbound/`, `tests/integration/quota-*.test.ts`                                                           |
| **A05 Security Misconfiguration**          | Missing headers, open CORS                  | CSP (ADR 0010), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP; no CORS headers (same-origin API); `X-Powered-By` disabled; env validated at boot and the app refuses to run misconfigured                                                                                                                                      | `src/config/security-headers.ts`, `tests/e2e/security.spec.ts`                                                       |
| **A06 Vulnerable Components**              | Supply chain                                | Committed lockfile pinned to the public npm registry (`.npmrc`); Dependabot (npm, Actions, Docker) weekly; CI runs `npm audit --omit=dev --audit-level=high`                                                                                                                                                                                                             | `.npmrc`, `.github/dependabot.yml`, `.github/workflows/ci.yml`                                                       |
| **A07 Identification & Auth Failures**     | —                                           | No user accounts or sessions by design (spec non-goal); the only privileged caller is cron (A01)                                                                                                                                                                                                                                                                         | —                                                                                                                    |
| **A08 Software & Data Integrity Failures** | Providers changing formats; poisoned caches | Zod validation of every provider response (contract error → fallback, never reaching the UI); empty AI completions are rejected before caching; Preview and Production caches are namespaced apart in the shared Redis                                                                                                                                                   | `src/infra/providers/*.schema.ts`, `src/modules/ai/ai.repository.ts`, `src/infra/outbound/keys.ts`                   |
| **A09 Logging & Monitoring Failures**      | Silent outages                              | One structured JSON log line per outbound call; alerts (Discord/Telegram) for quota 70/90%, circuit open, contract errors and two failed warm runs; `/status` reads the guard's own counters                                                                                                                                                                             | `src/infra/logger.ts`, `src/infra/alerts.ts`, `.github/workflows/warm-cache.yml`                                     |
| **A10 SSRF**                               | Making the server fetch attacker URLs       | Provider base URLs are constants; user input never forms a URL beyond whitelisted ids (`encodeURIComponent`)                                                                                                                                                                                                                                                             | `src/infra/providers/*.client.ts`                                                                                    |

## Rate limiting

Every public `/api/*` route is limited per client: 120 requests/min (`/api/ai/*`: 30/min), a
sliding window over two fixed windows in Redis. Responses carry `RateLimit-Limit`,
`RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` on 429. Client IPs are **never stored
raw**: only `sha256(IP_HASH_SALT + ip)` truncated to 32 hex chars, in keys that expire after two
windows. The limiter fails open if Redis is unreachable (cached data stays available).

The client address comes from the first `X-Forwarded-For` hop. On Vercel this header is set by the
edge and cannot be supplied by the client; when self-hosting (Docker), put a proxy in front that
overwrites it.

## CSRF

There are no cookies or sessions, so there are no ambient credentials to abuse. The only
state-changing route (`POST /api/cron/warm`) requires a bearer secret.

## Personal data

None is collected. The watchlist and preferences live only in the visitor's localStorage. Hashed
IPs used for rate limiting expire within two minutes.

## Dependency advisories

- Dev-only (2026-10-21): `braces` (GHSA-vfj7-8cjw-p6xm, stack-exhaustion DoS on crafted glob
  patterns) via `eslint-config-next` and the `shadcn` CLI. Both run only on developer/CI machines
  against repository-controlled globs; runtime dependencies are clean. Dependabot will update it.

## Reporting

Open a private security advisory on the GitHub repository.
