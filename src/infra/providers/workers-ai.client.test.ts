import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ContractError, ProviderHttpError } from "@/infra/outbound/errors";

import { setupProviderMocks } from "../../../tests/msw/server";

import { WORKERS_AI_BASE_URL, createWorkersAiClient } from "./workers-ai.client";

const { server } = setupProviderMocks();
const signal = (): AbortSignal => new AbortController().signal;
const RUN = `${WORKERS_AI_BASE_URL}/accounts/:account/ai/run/*`;
const request = {
  model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  messages: [{ role: "user" as const, content: "Hi" }],
  maxTokens: 400,
};

describe("createWorkersAiClient", () => {
  it("refuses a non-HTTPS base URL", () => {
    expect(() =>
      createWorkersAiClient({
        accountId: "a",
        apiToken: "t",
        baseUrl: "http://api.cloudflare.com",
      }),
    ).toThrow(/HTTPS/);
  });

  it("posts the messages to the account's model with a bearer token and an output cap", async () => {
    let url: URL | null = null;
    let auth: string | null = null;
    let body: unknown = null;
    server.use(
      http.post(RUN, async ({ request: req }) => {
        url = new URL(req.url);
        auth = req.headers.get("authorization");
        body = await req.clone().json();
        return undefined;
      }),
    );
    const res = await createWorkersAiClient({ accountId: "acc1", apiToken: "tok" }).chat(
      request,
      signal(),
    );
    expect(url!.pathname).toBe(
      "/client/v4/accounts/acc1/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    );
    expect(auth).toBe("Bearer tok");
    expect(body).toMatchObject({ messages: request.messages, max_tokens: 400 });
    expect(res.result.choices[0]!.message.content).toBeTruthy();
  });

  it("maps 401/429 to ProviderHttpError and a format change to ContractError", async () => {
    server.use(
      http.post(RUN, () =>
        HttpResponse.json(
          { result: null, success: false, errors: [{ code: 10000 }], messages: [] },
          { status: 401 },
        ),
      ),
    );
    const err = await createWorkersAiClient({ accountId: "a", apiToken: "t" })
      .chat(request, signal())
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err).toMatchObject({ status: 401 });

    server.use(http.post(RUN, () => HttpResponse.json({ success: true, result: { text: "x" } })));
    await expect(
      createWorkersAiClient({ accountId: "a", apiToken: "t" }).chat(request, signal()),
    ).rejects.toBeInstanceOf(ContractError);
  });
});
