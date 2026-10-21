import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ContractError, ProviderHttpError } from "@/infra/outbound/errors";

import { setupProviderMocks } from "../../../tests/msw/server";

import { COINGECKO_BASE_URL, createCoinGeckoClient } from "./coingecko.client";
import { createFrankfurterClient } from "./frankfurter.client";

const { server } = setupProviderMocks();
const signal = (): AbortSignal => new AbortController().signal;

describe("createCoinGeckoClient", () => {
  it("refuses a non-HTTPS base URL", () => {
    expect(() => createCoinGeckoClient({ baseUrl: "http://api.coingecko.com" })).toThrow(/HTTPS/);
  });

  it("sends the Demo key header and returns validated data", async () => {
    let key: string | null = null;
    server.use(
      http.get(`${COINGECKO_BASE_URL}/global`, ({ request }) => {
        key = request.headers.get("x-cg-demo-api-key");
        return HttpResponse.json({
          data: {
            active_cryptocurrencies: 1,
            total_market_cap: { usd: 1 },
            total_volume: { usd: 1 },
            market_cap_percentage: { btc: 50 },
            market_cap_change_percentage_24h_usd: 1,
            updated_at: 1,
          },
        });
      }),
    );
    const result = await createCoinGeckoClient({ apiKey: "demo-key" }).global(signal());
    expect(key).toBe("demo-key");
    expect(result.data.market_cap_percentage.btc).toBe(50);
  });

  it("maps 429 + Retry-After to ProviderHttpError", async () => {
    server.use(
      http.get(`${COINGECKO_BASE_URL}/coins/markets`, () =>
        HttpResponse.json(
          { error: "rate limited" },
          { status: 429, headers: { "retry-after": "60" } },
        ),
      ),
    );
    const err = await createCoinGeckoClient({})
      .markets(signal())
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err).toMatchObject({ status: 429, retryAfterSeconds: 60 });
  });

  it("maps a format change to ContractError", async () => {
    server.use(
      http.get(`${COINGECKO_BASE_URL}/coins/markets`, () => HttpResponse.json([{ id: 1 }])),
    );
    await expect(createCoinGeckoClient({}).markets(signal())).rejects.toBeInstanceOf(ContractError);
  });

  it("reads the 30d and 1y chart fixtures", async () => {
    const client = createCoinGeckoClient({});
    const [d30, y1] = await Promise.all([
      client.marketChart("bitcoin", 30, signal()),
      client.marketChart("bitcoin", 365, signal()),
    ]);
    expect(d30.prices.length).toBeGreaterThan(y1.prices.length);
  });
});

describe("createFrankfurterClient", () => {
  it("fetches latest and range from the canonical host", async () => {
    const client = createFrankfurterClient();
    expect((await client.latest("USD", signal())).base).toBe("USD");
    const range = await client.range("USD", "2025-10-21", ["IDR"], signal());
    expect(range.start_date).toBe("2025-10-21");
  });
});
