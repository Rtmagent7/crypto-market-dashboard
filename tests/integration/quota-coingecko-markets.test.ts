import { describe, expect, it } from "vitest";

import { CACHE_POLICY } from "@/config/cache-policy";
import { silentLogger } from "@/infra/logger";
import { createCallWithBudget, type BudgetResult } from "@/infra/outbound/call-with-budget";
import { createCoinGeckoClient } from "@/infra/providers/coingecko.client";
import type { CgMarketItem } from "@/infra/providers/coingecko.schema";
import { createMemoryStore } from "@/infra/store";

import { setupProviderMocks } from "../msw/server";

const { hits } = setupProviderMocks();

const DAY_MS = 86_400_000;
const START = Date.parse("2026-10-21T00:00:00Z");
const POLICY = CACHE_POLICY["coingecko:markets"];
/** calls/day = 86,400 ÷ TTL × keys (spec Section 4). */
const MAX_CALLS_PER_DAY = 86_400 / POLICY.ttl;

/** Deterministic PRNG (mulberry32) so the visitor pattern is reproducible. */
const prng = (seed: number): (() => number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

interface Harness {
  request: () => Promise<BudgetResult<CgMarketItem[]>>;
  setClock: (t: number) => void;
}

const harness = (): Harness => {
  let clock = START;
  const callWithBudget = createCallWithBudget({
    store: createMemoryStore(() => clock),
    logger: silentLogger,
    now: () => clock,
    sleep: async () => undefined,
  });
  const client = createCoinGeckoClient({});
  const request = (): Promise<BudgetResult<CgMarketItem[]>> =>
    callWithBudget({
      budget: "coingecko",
      endpoint: "/coins/markets",
      cacheKey: "market:top50",
      policy: POLICY,
      fetcher: (signal) => client.markets(signal),
    });
  return {
    request,
    setClock: (t) => {
      clock = t;
    },
  };
};

describe("quota compliance: /coins/markets", () => {
  it(`1,000 visitor requests over 24 h → ≤ ${MAX_CALLS_PER_DAY} provider calls`, async () => {
    const { request, setClock } = harness();
    const random = prng(42);
    const times = Array.from({ length: 1_000 }, () => START + Math.floor(random() * DAY_MS)).sort(
      (a, b) => a - b,
    );

    const statuses = new Set<string>();
    for (const t of times) {
      setClock(t);
      statuses.add((await request()).status);
    }

    expect(hits.get("coingecko:/coins/markets") ?? 0).toBeLessThanOrEqual(MAX_CALLS_PER_DAY);
    expect(statuses.has("unavailable")).toBe(false);
  });

  it("a 50-request burst on an expired cache makes exactly one provider call", async () => {
    const { request, setClock } = harness();
    setClock(START);
    await request();
    setClock(START + POLICY.ttl * 1000 + 1);

    const results = await Promise.all(Array.from({ length: 50 }, () => request()));

    expect(hits.get("coingecko:/coins/markets")).toBe(2);
    expect(results.every((r) => r.status !== "unavailable")).toBe(true);
  });

  it("call volume does not scale with visitors (10× traffic → same calls)", async () => {
    const run = async (visitorsPerMinute: number): Promise<number> => {
      hits.clear();
      const { request, setClock } = harness();
      for (let minute = 0; minute < 24 * 60; minute += 5) {
        for (let v = 0; v < visitorsPerMinute; v++) {
          setClock(START + minute * 60_000 + v);
          await request();
        }
      }
      return hits.get("coingecko:/coins/markets") ?? 0;
    };
    const low = await run(1);
    const high = await run(10);
    expect(high).toBe(low);
    expect(high).toBeLessThanOrEqual(MAX_CALLS_PER_DAY);
  });
});
