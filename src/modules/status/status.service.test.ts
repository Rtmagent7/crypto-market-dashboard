import { describe, expect, it } from "vitest";

import { createMemoryStore } from "@/infra/store";

import { createStatusRepository } from "./status.repository";
import { createStatusService } from "./status.service";

const NOW = Date.parse("2026-10-21T10:00:00Z");

describe("status service reads the gate's own keys", () => {
  it("applies the preview cap ratio to the cap it reports", async () => {
    const env = await createStatusService({
      repository: createStatusRepository({
        store: createMemoryStore(() => NOW),
        env: { BUDGET_CAP_RATIO: 0.1, VERCEL_ENV: "preview", NODE_ENV: "production" },
      }),
      now: () => NOW,
    }).getStatus();
    expect(env.data!.find((r) => r.id === "coingecko")!.quotaCap).toBe(800);
  });

  it("turns quota counters, breakers and cache entries into provider rows", async () => {
    const store = createMemoryStore(() => NOW);
    await store.set("quota:coingecko:2026-10", 1_234, { px: 60_000 });
    await store.set("cb:twelvedata:open", true, { px: 60_000 });
    await store.set(
      "cache:production:coingecko:markets:top50",
      { data: [], fetchedAt: NOW - 120_000, expiresAt: NOW + 780_000 },
      { px: 60_000 },
    );

    const env = await createStatusService({
      repository: createStatusRepository({
        store,
        env: {
          BUDGET_CAP_RATIO: 1,
          VERCEL_ENV: "production",
          NODE_ENV: "production",
          COINGECKO_API_KEY: "k",
          TWELVEDATA_API_KEY: "k",
          GROQ_API_KEY: "k",
        },
      }),
      now: () => NOW,
    }).getStatus();

    expect(env).toMatchObject({ status: "fresh", source: "internal" });
    const rows = Object.fromEntries(env.data!.map((r) => [r.id, r]));
    expect(rows.coingecko).toMatchObject({
      quotaUsed: 1_234,
      state: "operational",
      lastDataAt: new Date(NOW - 120_000).toISOString(),
    });
    expect(rows.twelvedata).toMatchObject({ state: "down" });
    expect(rows.coinmarketcap).toMatchObject({ state: "standby" });
  });

  it("is unavailable, not invented, when Redis cannot be read", async () => {
    const env = await createStatusService({
      repository: { snapshot: async () => Promise.reject(new Error("redis down")) },
      now: () => NOW,
    }).getStatus();
    expect(env).toMatchObject({ status: "unavailable", data: null });
  });
});
