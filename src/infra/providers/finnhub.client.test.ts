import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ContractError, ProviderHttpError } from "@/infra/outbound/errors";

import { setupProviderMocks } from "../../../tests/msw/server";

import { FINNHUB_BASE_URL, createFinnhubClient } from "./finnhub.client";

const { server } = setupProviderMocks();
const signal = (): AbortSignal => new AbortController().signal;

describe("createFinnhubClient", () => {
  it("refuses a non-HTTPS base URL", () => {
    expect(() => createFinnhubClient({ apiKey: "k", baseUrl: "http://finnhub.io/api/v1" })).toThrow(
      /HTTPS/,
    );
  });

  it("sends the key as a header, never in the URL", async () => {
    let url: URL | null = null;
    let token: string | null = null;
    server.use(
      http.get(`${FINNHUB_BASE_URL}/quote`, ({ request }) => {
        url = new URL(request.url);
        token = request.headers.get("x-finnhub-token");
        return undefined;
      }),
    );
    const q = await createFinnhubClient({ apiKey: "fh-key" }).quote("AAPL", signal());
    expect(token).toBe("fh-key");
    expect(Object.fromEntries(url!.searchParams)).toEqual({ symbol: "AAPL" });
    expect(q.c).toBeGreaterThan(0);
  });

  it("reads the US market status", async () => {
    const s = await createFinnhubClient({ apiKey: "k" }).marketStatus(signal());
    expect(s.exchange).toBe("US");
  });

  it("maps 429 to ProviderHttpError and a format change to ContractError", async () => {
    server.use(
      http.get(`${FINNHUB_BASE_URL}/quote`, () =>
        HttpResponse.json({ error: "API limit reached" }, { status: 429 }),
      ),
    );
    const err = await createFinnhubClient({ apiKey: "k" })
      .quote("AAPL", signal())
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err).toMatchObject({ status: 429 });

    server.use(http.get(`${FINNHUB_BASE_URL}/quote`, () => HttpResponse.json({ c: "1" })));
    await expect(
      createFinnhubClient({ apiKey: "k" }).quote("AAPL", signal()),
    ).rejects.toBeInstanceOf(ContractError);
  });
});
