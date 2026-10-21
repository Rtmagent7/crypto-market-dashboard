import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

const S = "x".repeat(32);
const COMPLETE = {
  COINGECKO_API_KEY: "cg",
  TWELVEDATA_API_KEY: "td",
  GROQ_API_KEY: "gq",
  KV_REST_API_URL: "https://example.upstash.io",
  KV_REST_API_TOKEN: "tok",
  CRON_SECRET: S,
  IP_HASH_SALT: S,
};

describe("parseEnv", () => {
  it("accepts a complete production configuration", () => {
    const env = parseEnv({ ...COMPLETE, NODE_ENV: "production" });
    expect(env.BUDGET_CAP_RATIO).toBe(1);
    expect(env.MOCK_PROVIDERS).toBe("0");
  });

  it("fails hard and lists every missing required variable", () => {
    expect(() => parseEnv({})).toThrowError(
      /COINGECKO_API_KEY[\s\S]*CRON_SECRET[\s\S]*KV_REST_API_URL/,
    );
  });

  it("allows mock mode with no keys at all", () => {
    expect(parseEnv({ MOCK_PROVIDERS: "1" }).MOCK_PROVIDERS).toBe("1");
  });

  it("rejects short secrets and plain-HTTP Redis in production", () => {
    expect(() => parseEnv({ ...COMPLETE, CRON_SECRET: "short" })).toThrowError(/CRON_SECRET/);
    expect(() =>
      parseEnv({ ...COMPLETE, NODE_ENV: "production", KV_REST_API_URL: "http://localhost:8079" }),
    ).toThrowError(/TLS/);
  });

  it("resolves the Redis REST endpoint from Marketplace or Upstash variable names", () => {
    const marketplace = parseEnv({
      ...COMPLETE,
      REDIS_URL: "rediss://default:x@example.upstash.io:6379",
    });
    expect(marketplace.redisRest).toEqual({ url: "https://example.upstash.io", token: "tok" });

    const rest: Record<string, string> = { ...COMPLETE };
    delete rest.KV_REST_API_URL;
    delete rest.KV_REST_API_TOKEN;
    const upstash = parseEnv({
      ...rest,
      UPSTASH_REDIS_REST_URL: "https://direct.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "direct",
    });
    expect(upstash.redisRest).toEqual({ url: "https://direct.upstash.io", token: "direct" });

    expect(parseEnv({ MOCK_PROVIDERS: "1" }).redisRest).toBeNull();
  });

  it("parses the preview cap ratio", () => {
    expect(parseEnv({ ...COMPLETE, BUDGET_CAP_RATIO: "0.1" }).BUDGET_CAP_RATIO).toBe(0.1);
    expect(() => parseEnv({ ...COMPLETE, BUDGET_CAP_RATIO: "2" })).toThrowError();
  });
});
