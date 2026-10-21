import "server-only";

import { ProviderHttpError } from "@/infra/outbound/errors";

import { groqTextDeltas } from "./groq-stream";
import { GroqCompletion } from "./groq.schema";
import { assertHttps, postJson } from "./http";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export interface GroqChatRequest {
  model: string;
  messages: readonly { role: "system" | "user"; content: string }[];
  maxTokens: number;
}

export interface GroqClient {
  chat(request: GroqChatRequest, signal: AbortSignal): Promise<GroqCompletion>;
  /** Streams the answer as validated text deltas (SSE from Groq). Resolves once headers arrive. */
  chatStream(request: GroqChatRequest, signal: AbortSignal): Promise<ReadableStream<string>>;
}

/**
 * HTTP + Zod only. gpt-oss models reason before answering and the reasoning shares the token
 * budget, so effort is kept low and the reasoning text is not returned.
 */
export const createGroqClient = ({
  apiKey,
  baseUrl = GROQ_BASE_URL,
}: {
  apiKey?: string;
  baseUrl?: string;
}): GroqClient => {
  const base = assertHttps(baseUrl);
  const headers: Record<string, string> = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
  const body = ({ model, messages, maxTokens }: GroqChatRequest, stream: boolean): string =>
    JSON.stringify({
      model,
      messages,
      max_completion_tokens: maxTokens,
      temperature: 0.2,
      reasoning_effort: "low",
      include_reasoning: false,
      stream,
    });
  return {
    chatStream: async (request, signal) => {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal,
        headers: { ...headers, "content-type": "application/json", accept: "text/event-stream" },
        body: body(request, true),
      });
      if (!res.ok || !res.body) {
        const retryAfter = Number(res.headers.get("retry-after"));
        throw new ProviderHttpError(
          res.status || 502,
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
        );
      }
      return groqTextDeltas(res.body);
    },
    chat: ({ model, messages, maxTokens }, signal) =>
      postJson(
        `${base}/chat/completions`,
        {
          model,
          messages,
          max_completion_tokens: maxTokens,
          temperature: 0.2,
          reasoning_effort: "low",
          include_reasoning: false,
        },
        GroqCompletion,
        { signal, headers },
      ),
  };
};
