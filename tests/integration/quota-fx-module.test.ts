import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { CACHE_POLICY } from "@/config/cache-policy";
import { silentLogger } from "@/infra/logger";
import { createCallWithBudget } from "@/infra/outbound/call-with-budget";
import { createExchangeRateClient } from "@/infra/providers/exchangerate.client";
import { createFrankfurterClient } from "@/infra/providers/frankfurter.client";
import { createMemoryStore } from "@/infra/store";
import { createFxRepository } from "@/modules/fx/fx.repository";
import { createFxService } from "@/modules/fx/fx.service";

import { setupProviderMocks } from "../msw/server";

const { hits, server } = setupProviderMocks();
const START = Date.parse("2026-10-21T00:00:00Z");
const perDay = (key: keyof typeof CACHE_POLICY): number => 86_400 / CACHE_POLICY[key].ttl;

const harness = (): { service: ReturnType<typeof createFxService>; at: (t: number) => void } => {
  let clock = START;
  const now = (): number => clock;
  const service = createFxService({
    repository: createFxRepository({
      callWithBudget: createCallWithBudget({
        store: createMemoryStore(now),
        logger: silentLogger,
        now,
        sleep: async () => undefined,
      }),
      frankfurter: createFrankfurterClient(),
      exchangerate: createExchangeRateClient(),
      now,
    }),
    now,
  });
  return { service, at: (t) => (clock = t) };
};

describe("quota compliance: fx module", () => {
  it("a visitor every minute for 24 h stays within the TTL formula; the backup is never called", async () => {
    const { service, at } = harness();
    for (let t = START; t < START + 86_400_000; t += 60_000) {
      at(t);
      expect((await service.getUsdIdr()).status).not.toBe("unavailable");
    }
    expect(hits.get("frankfurter:/latest")).toBeLessThanOrEqual(perDay("frankfurter:latest"));
    expect(hits.get("frankfurter:/range")).toBeLessThanOrEqual(perDay("frankfurter:range-1y"));
    expect(hits.get("exchangerate:/latest") ?? 0).toBe(0);
  });

  it("concurrent visitors at the TTL boundary never wake the backup", async () => {
    const { service, at } = harness();
    await service.getRates();
    at(START + CACHE_POLICY["frankfurter:latest"].ttl * 1000 + 1);
    const envs = await Promise.all(Array.from({ length: 10 }, () => service.getRates()));
    expect(envs.every((e) => e.source === "frankfurter")).toBe(true);
    expect(hits.get("frankfurter:/latest")).toBe(2);
    expect(hits.get("exchangerate:/latest") ?? 0).toBe(0);
  });

  it("when Frankfurter fails, ExchangeRate-API serves — and is cached by its own 24 h TTL", async () => {
    server.use(
      http.get("https://api.frankfurter.dev/v1/latest", () =>
        HttpResponse.json({}, { status: 503 }),
      ),
    );
    const { service, at } = harness();
    for (let t = START; t < START + 6 * 3_600_000; t += 60_000) {
      at(t);
      const env = await service.getRates();
      expect(env.status).not.toBe("unavailable");
    }
    expect((await service.getRates()).source).toBe("exchangerate");
    expect(hits.get("exchangerate:/latest")).toBe(1);
  });
});
