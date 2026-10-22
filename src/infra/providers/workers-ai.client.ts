import "server-only";

import { assertHttps, postJson } from "./http";
import { WaiCompletion } from "./workers-ai.schema";

export const WORKERS_AI_BASE_URL = "https://api.cloudflare.com/client/v4";

export interface WorkersAiChatRequest {
  model: string;
  messages: readonly { role: "system" | "user"; content: string }[];
  maxTokens: number;
}

export interface WorkersAiClient {
  chat(request: WorkersAiChatRequest, signal: AbortSignal): Promise<WaiCompletion>;
}

/** Backup LLM for the brief (spec 10.2). HTTP + Zod only; called from a repository. */
export const createWorkersAiClient = ({
  accountId,
  apiToken,
  baseUrl = WORKERS_AI_BASE_URL,
}: {
  accountId: string;
  apiToken: string;
  baseUrl?: string;
}): WorkersAiClient => {
  const base = assertHttps(baseUrl);
  const headers = { authorization: `Bearer ${apiToken}` };
  return {
    // The model id ("@cf/vendor/name") is a path, so its slashes stay as they are.
    chat: ({ model, messages, maxTokens }, signal) =>
      postJson(
        `${base}/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`,
        { messages, max_tokens: maxTokens, temperature: 0.2 },
        WaiCompletion,
        { signal, headers },
      ),
  };
};
