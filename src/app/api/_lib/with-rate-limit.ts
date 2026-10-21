import { connection, type NextRequest } from "next/server";

import { RATE_LIMITS } from "@/config/cache-policy";
import { getEnv } from "@/infra/env";
import { getStore } from "@/infra/redis";

import { clientIp, createRateLimiter, hashIp, type RateLimitResult } from "./rate-limit";

type Handler<C> = (request: NextRequest, context: C) => Promise<Response>;

const rateHeaders = (r: RateLimitResult): Record<string, string> => ({
  "RateLimit-Limit": String(r.limit),
  "RateLimit-Remaining": String(r.remaining),
  "RateLimit-Reset": String(r.resetSec),
});

/** Per-hashed-IP limit for an /api/* handler: 429 + Retry-After + RateLimit-* headers. */
export const withRateLimit =
  <C>(bucket: keyof typeof RATE_LIMITS, handler: Handler<C>): Handler<C> =>
  async (request, context) => {
    // Request-time first: otherwise Cache Components would prerender the route at build time.
    await connection();
    const env = getEnv();
    const limiter = createRateLimiter({
      store: getStore(env),
      prefix: bucket,
      ...RATE_LIMITS[bucket],
    });
    // Mock mode (local dev, E2E) runs without a salt; production requires IP_HASH_SALT (env.ts).
    const id = hashIp(clientIp(request.headers), env.IP_HASH_SALT ?? "mock-mode-salt");
    const result = await limiter.hit(id);
    if (!result.allowed) {
      return Response.json(
        { error: "Too many requests. Slow down and try again shortly." },
        {
          status: 429,
          headers: {
            ...rateHeaders(result),
            "Retry-After": String(result.resetSec),
            "cache-control": "no-store",
          },
        },
      );
    }
    const response = await handler(request, context);
    for (const [k, v] of Object.entries(rateHeaders(result))) response.headers.set(k, v);
    return response;
  };
