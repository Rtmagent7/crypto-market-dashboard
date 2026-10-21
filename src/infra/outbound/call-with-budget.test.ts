import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CachePolicy } from "@/config/cache-policy";
import type { Logger } from "@/infra/logger";
import { createMemoryStore, type KeyValueStore } from "@/infra/store";

import { BUDGETS } from "./budgets";
import { createCallWithBudget, type BudgetedCall } from "./call-with-budget";
import { ContractError, ProviderHttpError, ProviderTimeoutError } from "./errors";

const T0 = Date.parse("2026-10-21T10:00:00Z");
const POLICY: CachePolicy = { ttl: 900, staleFor: 7 * 86_400 };
const QUOTA_KEY = "quota:coingecko:2026-10";

let clock: number;
let store: KeyValueStore;
let logs: { level: string; event: string; fields: Record<string, unknown> }[];
let logger: Logger;

const setup = (overrides: Partial<Parameters<typeof createCallWithBudget>[0]> = {}) =>
  createCallWithBudget({
    store,
    logger,
    now: () => clock,
    sleep: async () => undefined,
    random: () => 0,
    ...overrides,
  });

const call = <T>(fetcher: BudgetedCall<T>["fetcher"], extra: Partial<BudgetedCall<T>> = {}) => ({
  budget: "coingecko" as const,
  endpoint: "/coins/markets",
  cacheKey: "market:top50",
  policy: POLICY,
  fetcher,
  ...extra,
});

/** Primes the cache with data fetched `ageSeconds` ago. */
const prime = async (data: unknown, ageSeconds: number): Promise<void> => {
  const callWithBudget = setup();
  const real = clock;
  clock = real - ageSeconds * 1000;
  await callWithBudget(call(async () => data));
  clock = real;
  await store.del(QUOTA_KEY);
};

const outbound = () => logs.filter((l) => l.event === "outbound_call");

beforeEach(() => {
  clock = T0;
  store = createMemoryStore(() => clock);
  logs = [];
  logger = { log: (level, event, fields) => logs.push({ level, event, fields }) };
});

describe("callWithBudget", () => {
  it("1. fresh cache hit → fetcher is not called", async () => {
    await prime(["btc"], 60);
    const fetcher = vi.fn(async () => ["new"]);

    const result = await setup()(call(fetcher));

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "fresh", data: ["btc"], cacheHit: true });
  });

  it("calls the provider on a miss, caches the data and reports when it expires", async () => {
    const fetcher = vi.fn(async () => ["btc"]);

    const result = await setup()(call(fetcher));

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "fresh",
      data: ["btc"],
      cacheHit: false,
      fetchedAt: T0,
      expiresAt: T0 + 900_000,
    });
    await expect(setup()(call(fetcher))).resolves.toMatchObject({ cacheHit: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches once the TTL has passed", async () => {
    await prime(["old"], 901);
    const result = await setup()(call(async () => ["new"]));
    expect(result).toMatchObject({ status: "fresh", data: ["new"], cacheHit: false });
  });

  describe("2. budget exhausted", () => {
    it("period cap reached → stale data, fetcher not called", async () => {
      await prime(["old"], 1_000);
      for (let i = 0; i < BUDGETS.coingecko.cap; i++) await store.incr(QUOTA_KEY, 60);
      const fetcher = vi.fn(async () => ["new"]);

      const result = await setup()(call(fetcher));

      expect(fetcher).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: "stale", data: ["old"], reason: "budget-exhausted" });
      expect(await store.get(QUOTA_KEY)).toBe(BUDGETS.coingecko.cap);
    });

    it("per-minute cap reached → stale data, fetcher not called", async () => {
      await prime(["old"], 1_000);
      const minuteKey = "quota:coingecko:m:2026-10-21T10:00";
      for (let i = 0; i < BUDGETS.coingecko.perMinute; i++) await store.incr(minuteKey, 120);
      const fetcher = vi.fn(async () => ["new"]);

      const result = await setup()(call(fetcher));

      expect(fetcher).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: "stale", reason: "minute-cap" });
    });

    it("no cache and no budget → unavailable", async () => {
      for (let i = 0; i < BUDGETS.coingecko.cap; i++) await store.incr(QUOTA_KEY, 60);
      const result = await setup()(call(async () => ["new"]));
      expect(result).toEqual({ status: "unavailable", reason: "budget-exhausted" });
    });

    it("capRatio scales caps down (preview deployments run at 10%)", async () => {
      for (let i = 0; i < 800; i++) await store.incr(QUOTA_KEY, 60);
      const fetcher = vi.fn(async () => ["new"]);
      const result = await setup({ capRatio: 0.1 })(call(fetcher));
      expect(fetcher).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: "unavailable", reason: "budget-exhausted" });
    });
  });

  describe("3. single-flight", () => {
    it("a held lock sends concurrent requests to stale data", async () => {
      await prime(["old"], 1_000);
      let release: (v: string[]) => void = () => undefined;
      const slow = vi.fn(() => new Promise<string[]>((resolve) => (release = resolve)));
      const callWithBudget = setup();

      const first = callWithBudget(call(slow));
      await vi.waitFor(() => expect(slow).toHaveBeenCalled());
      const second = await callWithBudget(call(vi.fn(async () => ["other"])));
      release(["new"]);

      expect(second).toMatchObject({ status: "stale", data: ["old"], reason: "locked" });
      await expect(first).resolves.toMatchObject({ status: "fresh", data: ["new"] });
      expect(slow).toHaveBeenCalledTimes(1);
    });

    it("releases the lock after the call so the next expiry can refetch", async () => {
      const callWithBudget = setup();
      await callWithBudget(call(async () => ["a"]));
      clock += 901_000;
      await expect(callWithBudget(call(async () => ["b"]))).resolves.toMatchObject({
        data: ["b"],
      });
    });
  });

  describe("4. fetcher error", () => {
    it("returns stale data and the counter still counts the real call", async () => {
      await prime(["old"], 1_000);

      const result = await setup()(
        call(async () => {
          throw new ProviderHttpError(400);
        }),
      );

      expect(result).toMatchObject({ status: "stale", data: ["old"], reason: "provider-error" });
      expect(await store.get(QUOTA_KEY)).toBe(1);
    });

    it("retries 5xx twice with backoff, counting every attempt", async () => {
      const sleep = vi.fn(async () => undefined);
      const fetcher = vi
        .fn<() => Promise<string[]>>()
        .mockRejectedValueOnce(new ProviderHttpError(502))
        .mockRejectedValueOnce(new ProviderTimeoutError(8_000))
        .mockResolvedValueOnce(["ok"]);

      const result = await setup({ sleep, random: () => 0.5 })(call(fetcher));

      expect(result).toMatchObject({ status: "fresh", data: ["ok"] });
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(sleep.mock.calls).toEqual([[625], [1_625]]);
      expect(await store.get(QUOTA_KEY)).toBe(3);
    });

    it("gives up after two retries", async () => {
      const fetcher = vi.fn(async () => {
        throw new ProviderHttpError(503);
      });
      const result = await setup()(call(fetcher));
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ status: "unavailable", reason: "provider-error" });
    });

    it("does not retry 429 and respects Retry-After as a cooldown", async () => {
      await prime(["old"], 1_000);
      const fetcher = vi.fn(async () => {
        throw new ProviderHttpError(429, 120);
      });
      const callWithBudget = setup();

      await expect(callWithBudget(call(fetcher))).resolves.toMatchObject({
        status: "stale",
        reason: "provider-error",
      });
      expect(fetcher).toHaveBeenCalledTimes(1);

      clock += 60_000;
      await expect(callWithBudget(call(fetcher))).resolves.toMatchObject({ reason: "cooldown" });
      expect(fetcher).toHaveBeenCalledTimes(1);

      clock += 61_000;
      await callWithBudget(call(fetcher));
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("does not retry contract errors and reports them distinctly", async () => {
      const fetcher = vi.fn(async () => {
        throw new ContractError([]);
      });
      const result = await setup()(call(fetcher));
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: "unavailable", reason: "contract-error" });
      expect(logs.some((l) => l.event === "contract_error" && l.level === "error")).toBe(true);
    });

    it("turns a hung provider into a timeout via AbortSignal", async () => {
      const fetcher = vi.fn(
        (signal: AbortSignal) =>
          new Promise<string[]>((_, reject) =>
            signal.addEventListener("abort", () => reject(signal.reason)),
          ),
      );
      const result = await setup({ timeoutMs: 5, retryDelaysMs: [] })(call(fetcher));
      expect(result).toEqual({ status: "unavailable", reason: "provider-error" });
      expect(outbound()[0]?.fields.status).toBe("timeout");
    });
  });

  describe("5. counters use the provider's reset timezone", () => {
    it("increments the period and minute counters for the current dayKey", async () => {
      await setup()(
        call(async () => 1, { budget: "twelvedata", cacheKey: "stocks:quote", endpoint: "/quote" }),
      );
      expect(await store.get("quota:twelvedata:2026-10-21")).toBe(1);
      expect(await store.get("quota:twelvedata:m:2026-10-21T10:00")).toBe(1);
    });

    it("starts a new counter after the reset", async () => {
      const callWithBudget = setup();
      clock = Date.parse("2026-10-21T23:59:00Z");
      await callWithBudget(call(async () => 1, { budget: "twelvedata", cacheKey: "a" }));
      clock = Date.parse("2026-10-22T00:01:00Z");
      await callWithBudget(call(async () => 1, { budget: "twelvedata", cacheKey: "b" }));
      expect(await store.get("quota:twelvedata:2026-10-21")).toBe(1);
      expect(await store.get("quota:twelvedata:2026-10-22")).toBe(1);
    });
  });

  it("6. emits one structured log line per outbound call", async () => {
    await setup()(call(async () => ["btc"], { requestId: "req-1" }));

    expect(outbound()).toHaveLength(1);
    expect(outbound()[0]?.fields).toEqual({
      provider: "coingecko",
      endpoint: "/coins/markets",
      cacheKey: "market:top50",
      cacheHit: false,
      stale: false,
      status: "ok",
      latencyMs: 0,
      quotaUsed: 1,
      quotaCap: 8_000,
      fallbackUsed: false,
      requestId: "req-1",
    });
  });

  describe("7. circuit breaker", () => {
    const failing = vi.fn(async () => {
      throw new ProviderHttpError(400);
    });

    it("opens after 5 consecutive failures and skips the provider for 10 minutes", async () => {
      const callWithBudget = setup();
      for (let i = 0; i < 5; i++) {
        await callWithBudget(call(failing, { cacheKey: `k${i}` }));
      }
      expect(logs.some((l) => l.event === "circuit_open")).toBe(true);

      const fetcher = vi.fn(async () => ["new"]);
      await expect(callWithBudget(call(fetcher))).resolves.toEqual({
        status: "unavailable",
        reason: "circuit-open",
      });
      expect(fetcher).not.toHaveBeenCalled();

      clock += 601_000;
      await expect(callWithBudget(call(fetcher))).resolves.toMatchObject({ status: "fresh" });
    });

    it("a success resets the failure streak", async () => {
      const callWithBudget = setup();
      for (let i = 0; i < 4; i++) await callWithBudget(call(failing, { cacheKey: `k${i}` }));
      await callWithBudget(call(async () => 1, { cacheKey: "ok" }));
      for (let i = 0; i < 4; i++) await callWithBudget(call(failing, { cacheKey: `j${i}` }));
      expect(logs.some((l) => l.event === "circuit_open")).toBe(false);
    });
  });

  it("serves expired-but-kept data as stale only within staleFor", async () => {
    await prime(["ancient"], 900 + 7 * 86_400 + 1);
    for (let i = 0; i < BUDGETS.coingecko.cap; i++) await store.incr(QUOTA_KEY, 60);
    const result = await setup()(call(async () => ["new"]));
    expect(result).toEqual({ status: "unavailable", reason: "budget-exhausted" });
  });
});
