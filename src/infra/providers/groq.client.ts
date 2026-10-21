import "server-only";

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
  return {
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
