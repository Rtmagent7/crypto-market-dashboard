# ADR 0010 — Content Security Policy without nonces

- Status: Accepted
- Date: 2026-10-22

## Context

Spec §11 asks for a strict CSP (`default-src 'self'`, images only from the CoinGecko host,
`connect-src 'self'`). Next.js streams React Server Component payloads in inline `<script>` tags.
A nonce-based policy would allow exactly those scripts, but nonces must be unique per request,
which forces every page into dynamic rendering. This app relies on prerendered shells (Partial
Prerendering, ADR 0009) for LCP: the table's skeleton arrives in the first HTML byte stream.

## Decision

Keep static/PPR rendering and allow inline scripts, while denying every external origin:

- `script-src 'self' 'unsafe-inline'` (no `'unsafe-eval'` in production)
- `default-src`, `connect-src`, `font-src`, `base-uri`, `form-action`: `'self'`
- `img-src 'self' data: blob:` + the CoinGecko image hosts
- `object-src 'none'`, `frame-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`
- Preview deployments additionally allow `vercel.live` (Vercel's comment toolbar) only.

The policy lives in `src/config/security-headers.ts` (unit-tested) and is applied to every route
by `next.config.ts`. An E2E test loads every MVP page and fails on any CSP violation.

## Consequences

- An XSS that injects an inline script would not be blocked by CSP alone. Mitigations that make
  such an injection hard in the first place: React escaping, ESLint `react/no-danger` (no
  `dangerouslySetInnerHTML` anywhere), AI output rendered as plain text after markdown/link
  stripping, Zod validation of every provider response, and no user-supplied HTML at all.
- No external script, style or connection can load, so a compromised CDN or a typo-squatted host
  cannot be pulled in.
- Revisit when Next.js supports hash-based CSP for streamed RSC payloads, or when a page has to be
  dynamic anyway (then nonces cost nothing for that page).
