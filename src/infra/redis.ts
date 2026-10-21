import "server-only";

import { Redis } from "@upstash/redis";

import type { Env } from "./env";
import { createMemoryStore, type KeyValueStore } from "./store";

/** KeyValueStore over Redis via the Upstash REST protocol (works from serverless functions). */
export const createRedisStore = (redis: Redis): KeyValueStore => ({
  async get<T>(key: string): Promise<T | null> {
    return redis.get<T>(key);
  },
  async set(key, value, { px, nx }) {
    const result = nx
      ? await redis.set(key, value, { px, nx: true })
      : await redis.set(key, value, { px });
    return result === "OK";
  },
  async incr(key, ttlSeconds, by = 1) {
    // INCRBY + EXPIRE NX in one round trip: the expiry starts with the counter and never slides.
    const [value] = await redis
      .pipeline()
      .incrby(key, by)
      .expire(key, ttlSeconds, "NX")
      .exec<[number, number]>();
    return value;
  },
  async decr(key, by = 1) {
    return redis.decrby(key, by);
  },
  async del(key) {
    await redis.del(key);
  },
});

let store: KeyValueStore | undefined;

/**
 * The in-memory store must be one per process, not one per route bundle: Next.js bundles each
 * route separately, so a module-level singleton would give /status a different "Redis" than the
 * pages it reports on.
 */
const processStore = globalThis as typeof globalThis & { __tidewaterMemoryStore?: KeyValueStore };

/**
 * Process-wide store. Real Redis whenever it is configured; the in-memory store only in mock
 * mode without Redis (zero-setup local dev). env.ts guarantees Redis outside mock mode.
 */
export const getStore = (env: Env): KeyValueStore => {
  if (store) return store;
  store = env.redisRest
    ? createRedisStore(new Redis(env.redisRest))
    : (processStore.__tidewaterMemoryStore ??= createMemoryStore());
  return store;
};
