import { z } from "zod";

import { ContractError } from "@/infra/outbound/errors";

// Built from tests/fixtures/groq-chat-stream.sse (a real streamed answer, 2026-10-22).
const GroqChunk = z.object({
  object: z.literal("chat.completion.chunk"),
  choices: z.array(
    z.object({
      delta: z.object({ content: z.string().nullish() }),
      finish_reason: z.string().nullable(),
    }),
  ),
});

/**
 * Groq's OpenAI-style SSE (`data: {chunk}` … `data: [DONE]`) → a stream of text deltas. Every
 * chunk is validated; events may arrive split across network reads.
 */
export const groqTextDeltas = (body: ReadableStream<Uint8Array>): ReadableStream<string> => {
  const decoder = new TextDecoder();
  let buffer = "";
  const reader = body.getReader();

  const parseEvent = (event: string): string | null => {
    const data = event
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (!data || data === "[DONE]") return null;
    const parsed = GroqChunk.safeParse(JSON.parse(data));
    if (!parsed.success) throw new ContractError(parsed.error.issues);
    return parsed.data.choices[0]?.delta.content ?? null;
  };

  return new ReadableStream<string>({
    async pull(controller) {
      for (;;) {
        const boundary = buffer.indexOf("\n\n");
        if (boundary !== -1) {
          const event = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const text = parseEvent(event);
          if (text) {
            controller.enqueue(text);
            return;
          }
          continue;
        }
        const { done, value } = await reader.read();
        if (done) {
          const text = buffer.trim() ? parseEvent(buffer) : null;
          if (text) controller.enqueue(text);
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
};
