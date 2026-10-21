import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createAlertingLogger, createAlertSink, type Alert } from "./alerts";
import type { Logger } from "./logger";
import { createMemoryStore } from "./store";

const received: { url: string; body: unknown }[] = [];
const server = setupServer(
  http.post("https://discord.com/api/webhooks/*", async ({ request }) => {
    received.push({ url: request.url, body: await request.json() });
    return new HttpResponse(null, { status: 204 });
  }),
  http.post("https://api.telegram.org/*", async ({ request }) => {
    received.push({ url: request.url, body: await request.json() });
    return HttpResponse.json({ ok: true });
  }),
  http.post("https://broken.example/hook", () => HttpResponse.error()),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  received.length = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

const ALERT: Alert = {
  key: "circuit:coingecko",
  title: "Circuit breaker opened",
  detail: "CoinGecko failed 5 times.",
};

describe("createAlertSink", () => {
  it("posts Discord's `content` shape", async () => {
    const sink = createAlertSink({
      url: "https://discord.com/api/webhooks/1/abc",
      store: createMemoryStore(),
    });
    await sink.send(ALERT);
    expect(received[0]!.body).toEqual({
      content: "⚠️ Circuit breaker opened\nCoinGecko failed 5 times.",
    });
  });

  it("posts Telegram's `text` shape", async () => {
    const sink = createAlertSink({
      url: "https://api.telegram.org/bot123:abc/sendMessage?chat_id=42",
      store: createMemoryStore(),
    });
    await sink.send(ALERT);
    expect(received[0]!.body).toMatchObject({
      text: "⚠️ Circuit breaker opened\nCoinGecko failed 5 times.",
    });
  });

  it("sends each alert key at most once per hour", async () => {
    let clock = 0;
    const sink = createAlertSink({
      url: "https://discord.com/api/webhooks/1/abc",
      store: createMemoryStore(() => clock),
    });
    await sink.send(ALERT);
    await sink.send(ALERT);
    expect(received).toHaveLength(1);
    clock += 3_601_000;
    await sink.send(ALERT);
    expect(received).toHaveLength(2);
  });

  it("never throws when the webhook is down", async () => {
    const sink = createAlertSink({
      url: "https://broken.example/hook",
      store: createMemoryStore(),
    });
    await expect(sink.send(ALERT)).resolves.toBe(false);
  });
});

describe("createAlertingLogger", () => {
  const capture = (): { logger: Logger; sent: Alert[] } => {
    const sent: Alert[] = [];
    const logger = createAlertingLogger(
      { log: () => undefined },
      { send: async (a) => (sent.push(a), true) },
    );
    return { logger, sent };
  };

  it("turns circuit_open, contract_error and quota_threshold into alerts", () => {
    const { logger, sent } = capture();
    logger.log("error", "circuit_open", { provider: "coingecko", openForSeconds: 600 });
    logger.log("error", "contract_error", { provider: "twelvedata", endpoint: "/quote" });
    logger.log("warn", "quota_threshold", {
      provider: "groq:summary",
      threshold: 90,
      used: 720,
      cap: 800,
      period: "2026-10-21",
    });
    expect(sent.map((a) => a.key)).toEqual([
      "circuit_open:coingecko",
      "contract_error:twelvedata:/quote",
      "quota_threshold:groq:summary:90:2026-10-21",
    ]);
    expect(sent[2]!.title).toMatch(/90%/);
  });

  it("ignores routine events", () => {
    const { logger, sent } = capture();
    logger.log("info", "outbound_call", { provider: "coingecko" });
    expect(sent).toEqual([]);
  });
});
