import "server-only";

import { AI } from "@/config/ai";
import { CACHE_POLICY } from "@/config/cache-policy";
import { getEnv } from "@/infra/env";
import type { BudgetResult, CallWithBudget } from "@/infra/outbound/call-with-budget";
import { ContractError } from "@/infra/outbound/errors";
import { getCallWithBudget } from "@/infra/outbound/gate";
import { createGroqClient, type GroqClient } from "@/infra/providers/groq.client";
import type { MarketBrief } from "@/modules/shared/domain";

import { fromGroqCompletion } from "./ai.mapper";
import { PROMPT_VERSION, type ChatMessage } from "./prompts";

export type { BudgetResult };

export interface AiRepository {
  /** `messages` is only built when the cache actually needs a new brief. */
  summary(messages: () => Promise<ChatMessage[]>): Promise<BudgetResult<MarketBrief>>;
  /** Ask AI: never cached; spends the separate `groq:chat` budget (global cap per day). */
  ask(messages: ChatMessage[]): Promise<BudgetResult<ReadableStream<string>>>;
}

export const createAiRepository = ({
  callWithBudget,
  groq,
}: {
  callWithBudget: CallWithBudget;
  groq: GroqClient;
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
});

let repository: AiRepository | undefined;

export const getAiRepository = (): AiRepository =>
  (repository ??= createAiRepository({
    callWithBudget: getCallWithBudget(),
    groq: createGroqClient({ apiKey: getEnv().GROQ_API_KEY }),
  }));
