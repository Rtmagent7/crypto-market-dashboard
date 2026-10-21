/**
 * Minimal key-value contract the outbound gate needs. Production binds it to Redis
 * (infra/redis.ts); tests and zero-setup local dev bind it to the in-memory store below.
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  /** SET with expiry; `nx` makes it a lock (only set when absent). Returns false if not set. */
  set(key: string, value: unknown, opts: { px: number; nx?: boolean }): Promise<boolean>;
  /** INCRBY (default 1), and start the expiry only when the key is new (EXPIRE … NX). */
  incr(key: string, ttlSeconds: number, by?: number): Promise<number>;
  decr(key: string, by?: number): Promise<number>;
  del(key: string): Promise<void>;
}

interface Entry {
  value: unknown;
  expiresAt: number;
}

/** In-memory KeyValueStore with an injectable clock (deterministic tests, single process). */
export const createMemoryStore = (now: () => number = Date.now): KeyValueStore => {
  const entries = new Map<string, Entry>();

  const live = (key: string): Entry | undefined => {
    const entry = entries.get(key);
    if (entry && entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  };

  return {
    async get<T>(key: string): Promise<T | null> {
      return (live(key)?.value as T | undefined) ?? null;
    },
    async set(key, value, { px, nx }) {
      if (nx && live(key)) return false;
      entries.set(key, { value: structuredClone(value), expiresAt: now() + px });
      return true;
    },
    async incr(key, ttlSeconds, by = 1) {
      const entry = live(key);
      const next = (typeof entry?.value === "number" ? entry.value : 0) + by;
      entries.set(key, { value: next, expiresAt: entry?.expiresAt ?? now() + ttlSeconds * 1000 });
      return next;
    },
    async decr(key, by = 1) {
      const entry = live(key);
      const next = (typeof entry?.value === "number" ? entry.value : 0) - by;
      entries.set(key, { value: next, expiresAt: entry?.expiresAt ?? Number.POSITIVE_INFINITY });
      return next;
    },
    async del(key) {
      entries.delete(key);
    },
  };
};
