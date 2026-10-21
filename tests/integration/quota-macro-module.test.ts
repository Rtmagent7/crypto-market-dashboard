import { http } from "msw";
import { describe, expect, it } from "vitest";

import { CACHE_POLICY } from "@/config/cache-policy";
import { MACRO_INDICATORS } from "@/config/macro";
import { silentLogger } from "@/infra/logger";
import { createCallWithBudget } from "@/infra/outbound/call-with-budget";
import { createWorldBankClient } from "@/infra/providers/worldbank.client";
import { createMemoryStore } from "@/infra/store";
import { createMacroRepository } from "@/modules/macro/macro.repository";
import { createMacroService } from "@/modules/macro/macro.service";

import { setupProviderMocks } from "../msw/server";

const { hits, server } = setupProviderMocks();
const START = Date.parse("2027-03-01T00:00:00Z");
const DAY = 86_400_000;

const harness = (): { service: ReturnType<typeof createMacroService>; at: (t: number) => void } => {
  let clock = START;
  const now = (): number => clock;
  const service = createMacroService({
    repository: createMacroRepository({
      callWithBudget: createCallWithBudget({
        store: createMemoryStore(now),
        logger: silentLogger,
        now,
        sleep: async () => undefined,
      }),
      worldbank: createWorldBankClient(),
      now,
    }),
    now,
  });
  return { service, at: (t) => (clock = t) };
};

describe("quota compliance: macro module", () => {
  it("asks for every whitelisted indicator in one call, up to the current year", async () => {
    const urls: URL[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("worldbank.org")) urls.push(new URL(request.url));
    });
    await harness().service.getIndicators();
    expect(urls).toHaveLength(1);
    expect(urls[0]!.pathname).toBe(
      `/v2/country/IDN/indicator/${MACRO_INDICATORS.map((i) => i.id).join(";")}`,
    );
    expect(urls[0]!.searchParams.get("date")).toBe("2010:2027");
    server.events.removeAllListeners();
  });

  it("a visitor every 10 minutes for 4 weeks costs one call per 7-day TTL", async () => {
    const { service, at } = harness();
    const days = 28;
    for (let t = START; t < START + days * DAY; t += 600_000) {
      at(t);
      expect((await service.getIndicators()).status).toBe("fresh");
    }
    const allowed = Math.ceil((days * 86_400) / CACHE_POLICY["worldbank:indicators"].ttl);
    expect(hits.get("worldbank:/indicator")).toBeLessThanOrEqual(allowed);
  });

  it("an outage after the TTL serves stale data with every indicator", async () => {
    const { service, at } = harness();
    await service.getIndicators();
    server.use(
      http.get("https://api.worldbank.org/v2/country/:country/indicator/:ids", () =>
        Response.json({}, { status: 503 }),
      ),
    );
    at(START + 8 * DAY);
    const env = await service.getIndicators();
    expect(env.status).toBe("stale");
    expect(env.data).toHaveLength(MACRO_INDICATORS.length);
  });
});
