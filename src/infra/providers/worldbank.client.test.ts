import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { MACRO_INDICATORS } from "@/config/macro";
import { ContractError, ProviderHttpError } from "@/infra/outbound/errors";

import error from "../../../tests/fixtures/worldbank-error.json";
import { setupProviderMocks } from "../../../tests/msw/server";

import { WORLDBANK_BASE_URL, createWorldBankClient } from "./worldbank.client";

const { server } = setupProviderMocks();
const signal = (): AbortSignal => new AbortController().signal;
const ids = MACRO_INDICATORS.map((i) => i.id);

describe("createWorldBankClient", () => {
  it("refuses a non-HTTPS base URL", () => {
    expect(() => createWorldBankClient({ baseUrl: "http://api.worldbank.org/v2" })).toThrow(
      /HTTPS/,
    );
  });

  it("asks for every indicator in one request and returns validated rows", async () => {
    let url: URL | null = null;
    server.use(
      http.get(`${WORLDBANK_BASE_URL}/country/:country/indicator/:ids`, ({ request }) => {
        url = new URL(request.url);
        return undefined; // fall through to the fixture handler
      }),
    );
    const [, rows] = await createWorldBankClient().indicators("IDN", ids, { from: 2010, to: 2026 }, signal());
    expect(url!.pathname).toBe(`/v2/country/IDN/indicator/${ids.join(";")}`);
    expect(Object.fromEntries(url!.searchParams)).toMatchObject({
      source: "2",
      format: "json",
      date: "2010:2026",
    });
    expect(rows.length).toBeGreaterThan(0);
  });

  it("turns the HTTP 200 error body into a non-retryable ProviderHttpError", async () => {
    server.use(
      http.get(`${WORLDBANK_BASE_URL}/country/:country/indicator/:ids`, () =>
        HttpResponse.json(error),
      ),
    );
    const err = await createWorldBankClient()
      .indicators("IDN", ids, { from: 2010, to: 2026 }, signal())
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err).toMatchObject({ status: 400 });
  });

  it("maps a format change to ContractError", async () => {
    server.use(
      http.get(`${WORLDBANK_BASE_URL}/country/:country/indicator/:ids`, () =>
        HttpResponse.json([{ page: 1 }, [{ value: "5.1" }]]),
      ),
    );
    const err = await createWorldBankClient()
      .indicators("IDN", ids, { from: 2010, to: 2026 }, signal())
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ContractError);
  });
});
