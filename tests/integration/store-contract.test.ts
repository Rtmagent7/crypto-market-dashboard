import { Redis } from "@upstash/redis";
import { describe, expect, it } from "vitest";

import { createRedisStore } from "@/infra/redis";
import { createMemoryStore, type KeyValueStore } from "@/infra/store";

// Real Redis runs when REDIS_URL/REDIS_TOKEN point at the docker-compose REST proxy
// (`docker compose up -d redis-http`) or the CI service container.
const redisUrl = process.env.TEST_REDIS_URL;
const redisToken = process.env.TEST_REDIS_TOKEN;

const stores: [string, () => KeyValueStore][] = [["memory", () => createMemoryStore()]];
if (redisUrl && redisToken) {
  stores.push(["redis", () => createRedisStore(new Redis({ url: redisUrl, token: redisToken }))]);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe.each(stores)("KeyValueStore contract (%s)", (_name, make) => {
  const store = make();
  const k = (s: string): string => `test:${Date.now()}:${Math.random()}:${s}`;

  it("round-trips JSON values", async () => {
    const key = k("json");
    await store.set(key, { data: [1, 2], fetchedAt: 5 }, { px: 5_000 });
    expect(await store.get(key)).toEqual({ data: [1, 2], fetchedAt: 5 });
    expect(await store.get(k("missing"))).toBeNull();
  });

  it("SET NX acts as a lock", async () => {
    const key = k("lock");
    expect(await store.set(key, "a", { px: 5_000, nx: true })).toBe(true);
    expect(await store.set(key, "b", { px: 5_000, nx: true })).toBe(false);
    expect(await store.get(key)).toBe("a");
    await store.del(key);
    expect(await store.set(key, "c", { px: 5_000, nx: true })).toBe(true);
  });

  it("INCR/DECR count atomically and the expiry starts with the counter", async () => {
    const key = k("counter");
    const values = await Promise.all(Array.from({ length: 20 }, () => store.incr(key, 1)));
    expect(new Set(values).size).toBe(20);
    expect(Math.max(...values)).toBe(20);
    expect(await store.decr(key)).toBe(19);
    await sleep(1_200);
    expect(await store.get(key)).toBeNull();
  });

  it("INCR by an amount (weighted quota)", async () => {
    const key = k("weighted");
    expect(await store.incr(key, 60, 8)).toBe(8);
    expect(await store.incr(key, 60, 8)).toBe(16);
    expect(await store.decr(key, 8)).toBe(8);
  });

  it("values expire after px", async () => {
    const key = k("px");
    await store.set(key, 1, { px: 200 });
    await sleep(350);
    expect(await store.get(key)).toBeNull();
  });
});
