# Security notes

Full OWASP Top 10 mapping is written in Sprint 4 (spec Section 0A). Items recorded so far:

## Supply chain (A03:2025 — Software Supply Chain Failures)

- Lockfile committed; Dependabot (npm, GitHub Actions, Docker) weekly.
- CI runs `npm audit --omit=dev --audit-level=high`: **runtime dependencies are clean**.
- Known dev-only advisory (2026-10-21): `braces` (GHSA-vfj7-8cjw-p6xm, stack-exhaustion DoS
  on crafted glob patterns) via `eslint-config-next` → `@next/eslint-plugin-next` →
  `fast-glob`, and via the `shadcn` CLI. Both run only on developer/CI machines against
  repository-controlled globs, never in the deployed app. `npm audit fix --force` would
  downgrade `eslint-config-next` to 14.x, which is worse. Re-check when Next.js publishes a
  fix; Dependabot will open the PR.
- The `shadcn` CLI is a devDependency only (its `shadcn/tailwind.css` is consumed at build).
