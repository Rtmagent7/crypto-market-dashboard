import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ContractError, ProviderHttpError } from "@/infra/outbound/errors";

import { setupProviderMocks } from "../../../tests/msw/server";

import { COINMARKETCAP_BASE_URL, createCoinMarketCapClient } from "./coinmarketcap.client";

const { server } = setupProviderMocks();
const signal = (): AbortSignal => new AbortController().signal;
const LISTINGS = `${COINMARKETCAP_BASE_URL}/v1/cryptocurrency/listings/latest`;

describe("createCoinMarketCapClient", () => {
  it("refuses a non-HTTPS base URL", () => {
    expect(() =>
      createCoinMarketCapClient({ apiKey: "k", baseUrl: "http://pro-api.coinmarketcap.com" }),
    ).toThrow(/HTTPS/);
  });

  it("asks for the top 50 in USD with the key header, one credit", async () => {
    let url: URL | null = null;
    let key: string | null = null;
    server.use(
      http.get(LISTINGS, ({ request }) => {
        url = new URL(request.url);
        key = request.headers.get("x-cmc_pro_api_key");
        return undefined;
      }),
    );
    const res = await createCoinMarketCapClient({ apiKey: "cmc-key" }).listings(signal());
    expect(key).toBe("cmc-key");
    expect(Object.fromEntries(url!.searchParams)).toEqual({ limit: "50", convert: "USD" });
    expect(res.data).toHaveLength(50);
  });

  it("maps 429 to ProviderHttpError and a format change to ContractError", async () => {
    server.use(
      http.get(LISTINGS, () =>
        HttpResponse.json({ status: { error_code: 1008 } }, { status: 429 }),
      ),
    );
    const err = await createCoinMarketCapClient({ apiKey: "k" })
      .listings(signal())
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err).toMatchObject({ status: 429 });
    server.use(http.get(LISTINGS, () => HttpResponse.json({ data: [{ id: "1" }] })));
    await expect(
      createCoinMarketCapClient({ apiKey: "k" }).listings(signal()),
    ).rejects.toBeInstanceOf(ContractError);
  });
});
