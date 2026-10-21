import type { NextRequest } from "next/server";

import { ASK_AI_DAILY } from "@/config/cache-policy";
import { getEnv } from "@/infra/env";
import { getStore } from "@/infra/redis";
import { cleanBrief } from "@/modules/ai/ai.mapper";
import { getAiService } from "@/modules/ai/ai.service";

import { clientIp, hashIp } from "../../_lib/rate-limit";
import { withRateLimit } from "../../_lib/with-rate-limit";
import { isSameOrigin, parseQuestion, sseEvent } from "./guard";

const MAX_ANSWER_WORDS = 200;
const noStore = { "cache-control": "no-store" };

const UNAVAILABLE_MESSAGES = {
  "no-market-data": "Market data is not available right now, so there is nothing to answer from.",
  "budget-exhausted": "Ask AI has used today's shared budget. It resets at 00:00 UTC.",
  provider: "The AI provider is not responding. Try again in a few minutes.",
} as const;

/**
 * POST /api/ai/chat {question} → text/event-stream of `delta` events and one `done` event with
 * the cleaned answer. Limits (spec §11): 30/min burst, 5 questions per hashed IP per day, and
 * 100/day globally through the groq:chat budget. Answers use cached market data only.
 */
async function handle(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request.headers, request.nextUrl.origin)) {
    return Response.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }
  const body = parseQuestion(await request.json().catch(() => null));
  if (!body.ok) {
    return Response.json(
      { error: "question must be 3–500 characters" },
      { status: 400, headers: noStore },
    );
  }

  const env = getEnv();
  const store = getStore(env);
  const day = new Date().toISOString().slice(0, 10);
  const key = `ask:${day}:${hashIp(clientIp(request.headers), env.IP_HASH_SALT ?? "mock-mode-salt")}`;
  const used = await store.incr(key, 2 * ASK_AI_DAILY.windowSec);
  if (used > ASK_AI_DAILY.limit) {
    await store.decr(key);
    return Response.json(
      {
        error: `You have asked ${ASK_AI_DAILY.limit} questions today. Ask AI resets at 00:00 UTC.`,
      },
      { status: 429, headers: { ...noStore, "Retry-After": "3600" } },
    );
  }

  const result = await getAiService().ask(body.question);
  if (result.status === "unavailable") {
    await store.decr(key); // nothing was answered, so the visitor keeps the question
    return Response.json(
      { error: UNAVAILABLE_MESSAGES[result.reason] },
      { status: 503, headers: { ...noStore, "Retry-After": "300" } },
    );
  }

  const encoder = new TextEncoder();
  const reader = result.deltas.getReader();
  let full = "";
  // A stream that breaks mid-answer ends with an `error` event instead of a silently cut answer.
  const events = new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      try {
        const { done, value } = await reader.read();
        if (done) {
          const text = cleanBrief(full, MAX_ANSWER_WORDS);
          controller.enqueue(
            encoder.encode(sseEvent("done", { text, remaining: ASK_AI_DAILY.limit - used })),
          );
          controller.close();
          return;
        }
        full += value;
        controller.enqueue(encoder.encode(sseEvent("delta", { text: value })));
      } catch {
        controller.enqueue(
          encoder.encode(sseEvent("error", { error: UNAVAILABLE_MESSAGES.provider })),
        );
        controller.close();
      }
    },
    cancel: (reason) => reader.cancel(reason),
  });
  return new Response(events, {
    headers: {
      ...noStore,
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    },
  });
}

export const POST = withRateLimit("ai", handle);
