import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

const S = "x".repeat(32);
const COMPLETE = {
  COINGECKO_API_KEY: "cg",
  TWELVEDATA_API_KEY: "td",
  GROQ_API_KEY: "gq",
  REDIS_URL: "https://example.upstash.io",
  REDIS_TOKEN: "tok",
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
    expect(() => parseEnv({})).toThrowError(/COINGECKO_API_KEY[\s\S]*REDIS_URL[\s\S]*CRON_SECRET/);
  });

  it("allows mock mode with no keys at all", () => {
    expect(parseEnv({ MOCK_PROVIDERS: "1" }).MOCK_PROVIDERS).toBe("1");
  });

  it("rejects short secrets and plain-HTTP Redis in production", () => {
    expect(() => parseEnv({ ...COMPLETE, CRON_SECRET: "short" })).toThrowError(/CRON_SECRET/);
    expect(() =>
      parseEnv({ ...COMPLETE, NODE_ENV: "production", REDIS_URL: "http://localhost:8079" }),
    ).toThrowError(/TLS/);
  });

  it("parses the preview cap ratio", () => {
    expect(parseEnv({ ...COMPLETE, BUDGET_CAP_RATIO: "0.1" }).BUDGET_CAP_RATIO).toBe(0.1);
    expect(() => parseEnv({ ...COMPLETE, BUDGET_CAP_RATIO: "2" })).toThrowError();
  });
});
