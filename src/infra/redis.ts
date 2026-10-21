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
  async incr(key, ttlSeconds) {
    // INCR + EXPIRE NX in one round trip: the expiry starts with the counter and never slides.
    const [value] = await redis
      .pipeline()
      .incr(key)
      .expire(key, ttlSeconds, "NX")
      .exec<[number, number]>();
    return value;
  },
  async decr(key) {
    return redis.decr(key);
  },
  async del(key) {
    await redis.del(key);
  },
});

let store: KeyValueStore | undefined;

/**
 * Process-wide store. Real Redis whenever it is configured; the in-memory store only in mock
 * mode without Redis (zero-setup local dev). env.ts guarantees Redis outside mock mode.
 */
export const getStore = (env: Env): KeyValueStore => {
  if (store) return store;
  store = env.redisRest ? createRedisStore(new Redis(env.redisRest)) : createMemoryStore();
  return store;
};
