# ADR 0008 — Scope of technology

- Status: Accepted
- Date: 2026-10-22

## Context

The engineer's profile spans far more technology than this project needs. Adding a tool only to
show it adds cost, attack surface and maintenance, and reads as poor judgment to a reviewer.

## Decision

Build only what solves a real problem here (✅ in spec §0B). Stretch items (🟡) wait for an
explicit go after launch. Everything else is deliberately out, with where it would fit better:

| Not used                                   | Why not here                                                                                               | Better fit                                 |
| :----------------------------------------- | :--------------------------------------------------------------------------------------------------------- | :----------------------------------------- |
| Vue/Nuxt, Angular                          | One framework per project; Next.js fits RSC + PPR                                                          | A separate SPA project                     |
| Redux Toolkit, SWR, RTK Query              | UI state is tiny (Zustand); TanStack Query already polls                                                   | Large client state machines                |
| Styled-Components/Emotion, MUI             | Runtime CSS-in-JS conflicts with Server Components; MUI's look conflicts with Tidewater                    | —                                          |
| Express, NestJS, FastAPI, Go, Spring, .NET | Route handlers + framework-free `modules/` already give layering; a second service adds a deploy and a hop | Projects 2–3 with long-running workers     |
| GraphQL, gRPC, WebSockets                  | Six read-only resources changing every 15–20 min; REST + CDN caching is simpler                            | Real-time or service-to-service systems    |
| OAuth/JWT/RBAC/Auth providers              | No login (non-goal)                                                                                        | Any project with accounts                  |
| Pagination                                 | Every list is fixed and ≤ 50                                                                               | Unbounded data (Projects 2–3)              |
| PostgreSQL + Drizzle, Supabase (🟡)        | Redis counters expire; durable history is a stretch (S1)                                                   | 30-day status history                      |
| MySQL, MongoDB, DynamoDB                   | No document/relational workload                                                                            | —                                          |
| Kubernetes, AWS/GCP/Azure, CDK, Netlify    | One stateless app at $0; Vercel + Upstash suffice                                                          | Projects needing object storage or workers |
| Terraform (🟡)                             | Stretch S2                                                                                                 | Managing Vercel + Upstash as code          |
| Jest, Cypress, PyTest                      | Vitest and Playwright cover the same needs                                                                 | —                                          |
| OpenAI / Anthropic APIs                    | Paid APIs break the $0 constraint; `GroqClient` keeps the swap to one file                                 | Paid tiers                                 |
| LangChain, vector DBs, RAG                 | One prompt, small fresh context                                                                            | Document Q&A                               |

## Consequences

The stack stays small enough to explain in a two-minute walkthrough. Each "not used" row is a
conscious decision a reviewer can challenge.
