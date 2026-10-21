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

    REDIS_URL: z.url().optional(),
    REDIS_TOKEN: optional,

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
  .superRefine((env, ctx) => {
    // Mock mode (local dev, tests, E2E) runs with zero real keys and an in-memory store.
    if (env.MOCK_PROVIDERS === "1") return;
    const required = [
      "COINGECKO_API_KEY",
      "TWELVEDATA_API_KEY",
      "GROQ_API_KEY",
      "REDIS_URL",
      "REDIS_TOKEN",
      "CRON_SECRET",
      "IP_HASH_SALT",
    ] as const;
    for (const key of required) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "is required" });
    }
    if (env.REDIS_URL && env.NODE_ENV === "production" && !env.REDIS_URL.startsWith("https://")) {
      ctx.addIssue({ code: "custom", path: ["REDIS_URL"], message: "must use TLS (https://)" });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

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
