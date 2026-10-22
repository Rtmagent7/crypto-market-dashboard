import { z } from "zod";

// Built from tests/fixtures/workers-ai-summary.json (captured 2026-10-22): an OpenAI-style chat
// completion inside Cloudflare's { result, success, errors, messages } envelope.
export const WaiCompletion = z.object({
  success: z.literal(true),
  result: z.object({
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
      /** Cloudflare's billing unit (10,000 free per day). */
      neurons: z.number().optional(),
    }),
  }),
});

export type WaiCompletion = z.infer<typeof WaiCompletion>;
