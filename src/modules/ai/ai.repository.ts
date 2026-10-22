import "server-only";

import { AI } from "@/config/ai";
import { CACHE_POLICY } from "@/config/cache-policy";
import { getEnv } from "@/infra/env";
import type { BudgetResult, CallWithBudget } from "@/infra/outbound/call-with-budget";
import { ContractError } from "@/infra/outbound/errors";
import { getCallWithBudget } from "@/infra/outbound/gate";
import { createGroqClient, type GroqClient } from "@/infra/providers/groq.client";
import { createWorkersAiClient, type WorkersAiClient } from "@/infra/providers/workers-ai.client";
import type { MarketBrief } from "@/modules/shared/domain";

import { fromGroqCompletion, fromWorkersAi } from "./ai.mapper";
import { PROMPT_VERSION, type ChatMessage } from "./prompts";

export type { BudgetResult };

export interface AiRepository {
  /** `messages` is only built when the cache actually needs a new brief. */
  summary(messages: () => Promise<ChatMessage[]>): Promise<BudgetResult<MarketBrief>>;
  /** Backup brief (spec 10.2). Never called without CF_ACCOUNT_ID + CF_AI_TOKEN. */
  workersAiSummary(messages: () => Promise<ChatMessage[]>): Promise<BudgetResult<MarketBrief>>;
  /** Ask AI: never cached; spends the separate `groq:chat` budget (global cap per day). */
  ask(messages: ChatMessage[]): Promise<BudgetResult<ReadableStream<string>>>;
}

export const createAiRepository = ({
  callWithBudget,
  groq,
  workersAi = null,
}: {
  callWithBudget: CallWithBudget;
  groq: GroqClient;
  /** null (the default) when the Cloudflare account or token is not set. */
  workersAi?: WorkersAiClient | null;
}): AiRepository => ({
  ask: (messages) =>
    callWithBudget<ReadableStream<string>>({
      budget: "groq:chat",
      endpoint: "/chat/completions?stream",
      cacheKey: "groq:chat",
      cache: false,
      policy: CACHE_POLICY["groq:summary"], // unused when cache is false
      fetcher: (signal) =>
        groq.chatStream({ model: AI.chatModel, messages, maxTokens: AI.maxTokens }, signal),
    }),
  summary: (messages) =>
    callWithBudget<MarketBrief>({
      budget: "groq:summary",
      endpoint: "/chat/completions",
      cacheKey: "groq:summary",
      policy: CACHE_POLICY["groq:summary"],
      fetcher: async (signal) => {
        const completion = await groq.chat(
          { model: AI.summaryModel, messages: await messages(), maxTokens: AI.maxTokens },
          signal,
        );
        // Validate before caching: an empty completion must never replace the last good brief.
        const brief = fromGroqCompletion(completion, PROMPT_VERSION, AI.maxWords);
        if (!brief) throw new ContractError([]);
        return brief;
      },
    }),
  workersAiSummary: async (messages) =>
    workersAi
      ? callWithBudget<MarketBrief>({
          budget: "workers-ai",
          endpoint: "/ai/run/{model}",
          // Same key /status reads for this provider's data age (config/providers.ts).
          cacheKey: "workers-ai:summary",
          policy: CACHE_POLICY["workers-ai:summary"],
          fetcher: async (signal) => {
            const completion = await workersAi.chat(
              { model: AI.workersAiModel, messages: await messages(), maxTokens: AI.maxTokens },
              signal,
            );
            const brief = fromWorkersAi(completion, PROMPT_VERSION, AI.maxWords);
            if (!brief) throw new ContractError([]);
            return brief;
          },
        })
      : { status: "unavailable", reason: "not-configured" },
});

let repository: AiRepository | undefined;

export const getAiRepository = (): AiRepository => {
  if (repository) return repository;
  const env = getEnv();
  // In mock mode MSW answers, so the backup path is exercised without a real account.
  const mock = env.MOCK_PROVIDERS === "1";
  const accountId = env.CF_ACCOUNT_ID ?? (mock ? "mock" : undefined);
  const apiToken = env.CF_AI_TOKEN ?? (mock ? "mock" : undefined);
  return (repository = createAiRepository({
    callWithBudget: getCallWithBudget(),
    groq: createGroqClient({ apiKey: env.GROQ_API_KEY }),
    workersAi: accountId && apiToken ? createWorkersAiClient({ accountId, apiToken }) : null,
  }));
};
