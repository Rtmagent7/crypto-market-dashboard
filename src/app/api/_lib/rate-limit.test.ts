import { describe, expect, it } from "vitest";

import { createMemoryStore, type KeyValueStore } from "@/infra/store";

import { clientIp, createRateLimiter, hashIp } from "./rate-limit";

const T0 = Date.parse("2026-10-21T10:00:00Z");

describe("hashIp — IPs are never stored raw (spec §11)", () => {
  it("is a salted, stable hash that does not contain the IP", () => {
    const a = hashIp("203.0.113.7", "salt-1");
    expect(a).toBe(hashIp("203.0.113.7", "salt-1"));
    expect(a).not.toBe(hashIp("203.0.113.7", "salt-2"));
    expect(a).not.toContain("203.0.113.7");
    expect(a).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("clientIp", () => {
  it("takes the first X-Forwarded-For hop, then X-Real-IP", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("createRateLimiter — sliding window", () => {
  const setup = (
    limit = 5,
  ): {
    hit: (id: string) => ReturnType<ReturnType<typeof createRateLimiter>["hit"]>;
    at: (t: number) => void;
  } => {
    let clock = T0;
    const limiter = createRateLimiter({
      store: createMemoryStore(() => clock),
      now: () => clock,
      limit,
      windowSec: 60,
      prefix: "api",
    });
    return { hit: (id) => limiter.hit(id), at: (t) => (clock = t) };
  };

  it("allows up to the limit, then refuses with the seconds until it frees up", async () => {
    const { hit } = setup(3);
    for (let i = 0; i < 3; i++) expect((await hit("ip")).allowed).toBe(true);
    const refused = await hit("ip");
    expect(refused).toMatchObject({ allowed: false, remaining: 0, limit: 3 });
    expect(refused.resetSec).toBeGreaterThan(0);
  });

  it("keeps clients separate", async () => {
    const { hit } = setup(1);
    expect((await hit("a")).allowed).toBe(true);
    expect((await hit("b")).allowed).toBe(true);
    expect((await hit("a")).allowed).toBe(false);
  });

  it("weights the previous window so a burst at a boundary cannot double the limit", async () => {
    const { hit, at } = setup(4);
    at(T0 + 59_000);
    for (let i = 0; i < 4; i++) await hit("ip");
    at(T0 + 61_000); // new window, but ~97% of the previous one still counts
    expect((await hit("ip")).allowed).toBe(false);
    at(T0 + 170_000); // the previous window has fully slid out
    expect((await hit("ip")).allowed).toBe(true);
  });

  it("fails open when the store is unavailable", async () => {
    const broken = {
      incr: () => Promise.reject(new Error("redis down")),
      get: () => Promise.reject(new Error("redis down")),
    } as unknown as KeyValueStore;
    const limiter = createRateLimiter({
      store: broken,
      now: () => T0,
      limit: 1,
      windowSec: 60,
      prefix: "api",
    });
    expect((await limiter.hit("ip")).allowed).toBe(true);
  });
});
