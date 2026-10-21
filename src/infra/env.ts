import "server-only";

import { z } from "zod";

/** ≥ 32 random characters (spec Section 13). */
const secret = z.string().min(32, "must be at least 32 characters");
const optional = z.string().min(1).optional();

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    MOCK_PROVIDERS: z.enum(["0", "1"]).default("0"),
    BUDGET_CAP_RATIO: z.coerce.number().gt(0).max(1).default(1),

    COINGECKO_API_KEY: optional,
    TWELVEDATA_API_KEY: optional,
    GROQ_API_KEY: optional,

    // Redis over the Upstash REST protocol. The Vercel Marketplace integration injects
    // KV_REST_API_*; a direct Upstash database exposes UPSTASH_REDIS_REST_*. REDIS_URL is
    // deliberately NOT read: the Marketplace sets it to a rediss:// TCP URL.
    KV_REST_API_URL: z.url().optional(),
    KV_REST_API_TOKEN: optional,
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: optional,

    CRON_SECRET: secret.optional(),
    IP_HASH_SALT: secret.optional(),

    CMC_API_KEY: optional,
    FINNHUB_API_KEY: optional,
    EXCHANGERATE_API_KEY: optional,
    CF_ACCOUNT_ID: optional,
    CF_AI_TOKEN: optional,
    ALERT_WEBHOOK_URL: z.url().optional(),
    BPS_API_KEY: optional,
    DATABASE_URL: optional,
  })
  .transform(
    ({
      KV_REST_API_URL,
      KV_REST_API_TOKEN,
      UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN,
      ...env
    }) => {
      const url = KV_REST_API_URL ?? UPSTASH_REDIS_REST_URL;
      const token = KV_REST_API_TOKEN ?? UPSTASH_REDIS_REST_TOKEN;
      return { ...env, redisRest: url && token ? { url, token } : null };
    },
  )
  .superRefine((env, ctx) => {
    // Mock mode (local dev, tests, E2E) runs with zero real keys and an in-memory store.
    if (env.MOCK_PROVIDERS === "1") return;
    const required = [
      "COINGECKO_API_KEY",
      "TWELVEDATA_API_KEY",
      "GROQ_API_KEY",
      "CRON_SECRET",
      "IP_HASH_SALT",
    ] as const;
    for (const key of required) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "is required" });
    }
    if (!env.redisRest) {
      ctx.addIssue({
        code: "custom",
        path: ["KV_REST_API_URL"],
        message: "is required (with KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL/_TOKEN)",
      });
    } else if (env.NODE_ENV === "production" && !env.redisRest.url.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["KV_REST_API_URL"],
        message: "must use TLS (https://)",
      });
    }
  });

export type Env = z.output<typeof EnvSchema>;

/** Validates and returns env; throws a readable error listing every problem. */
export const parseEnv = (source: Record<string, string | undefined>): Env => {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join("\n")}`);
  }
  return result.data;
};

let cached: Env | undefined;

/** Lazily validated process env, memoized. `instrumentation.ts` calls it at boot. */
export const getEnv = (): Env => (cached ??= parseEnv(process.env));
