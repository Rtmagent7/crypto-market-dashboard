import { z } from "zod";

// Built from tests/fixtures/groq-chat-*.json (OpenAI-compatible chat completion).
export const GroqCompletion = z.object({
  id: z.string(),
  model: z.string(),
  choices: z
    .array(
      z.object({
        message: z.object({ role: z.literal("assistant"), content: z.string().nullable() }),
        finish_reason: z.string().nullable(),
      }),
    )
    .min(1),
  usage: z.object({
    prompt_tokens: z.number().int(),
    completion_tokens: z.number().int(),
    total_tokens: z.number().int(),
  }),
});

export type GroqCompletion = z.infer<typeof GroqCompletion>;
