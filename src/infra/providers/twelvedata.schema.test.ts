import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ProviderHttpError } from "@/infra/outbound/errors";

import quote from "../../../tests/fixtures/twelvedata-quote.json";
import daily from "../../../tests/fixtures/twelvedata-time-series-1day.json";
import hourly from "../../../tests/fixtures/twelvedata-time-series-1h.json";
import { setupProviderMocks } from "../../../tests/msw/server";

import { createTwelveDataClient } from "./twelvedata.client";
import { TdQuoteBatch, TdSeriesBatch } from "./twelvedata.schema";

const { server } = setupProviderMocks();

describe("Twelve Data schemas match the real 8-ticker batches", () => {
  it("coerces string numbers in quotes", () => {
    const batch = TdQuoteBatch.parse(quote);
    expect(Object.keys(batch)).toHaveLength(8);
    const aapl = batch.AAPL!;
    expect("close" in aapl && typeof aapl.close).toBe("number");
  });

  it("parses hourly and daily series", () => {
    const h = TdSeriesBatch.parse(hourly).AAPL!;
    const d = TdSeriesBatch.parse(daily).SPY!;
    expect("values" in h && h.values.length).toBe(24);
    expect("values" in d && d.values.length).toBe(252);
  });

  it("keeps the batch when one symbol failed", () => {
    const withError = {
      ...quote,
      XYZ: { code: 404, message: "symbol not found", status: "error" },
    };
    expect(TdQuoteBatch.safeParse(withError).success).toBe(true);
  });
});

describe("createTwelveDataClient", () => {
  it("sends the key as a header, never in the URL", async () => {
    let url = "";
    let auth: string | null = null;
    server.use(
      http.get("https://api.twelvedata.com/quote", ({ request }) => {
        url = request.url;
        auth = request.headers.get("authorization");
        return HttpResponse.json(quote);
      }),
    );
    await createTwelveDataClient({ apiKey: "secret" }).quotes(
      ["AAPL"],
      new AbortController().signal,
    );
    expect(auth).toBe("apikey secret");
    expect(url).not.toContain("secret");
  });

  it("turns a 200-with-error body into a ProviderHttpError (no silent success)", async () => {
    server.use(
      http.get("https://api.twelvedata.com/quote", () =>
        HttpResponse.json({
          code: 429,
          message: "You have run out of API credits",
          status: "error",
        }),
      ),
    );
    const err = await createTwelveDataClient({ apiKey: "k" })
      .quotes(["AAPL"], new AbortController().signal)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err).toMatchObject({ status: 429 });
  });
});
