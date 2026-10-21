import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ContractError } from "@/infra/outbound/errors";

import { groqTextDeltas } from "./groq-stream";

const fixture = readFileSync("tests/fixtures/groq-chat-stream.sse", "utf8");

/** Splits text into byte chunks at arbitrary points, like a real network does. */
const streamOf = (text: string, chunkSize: number): ReadableStream<Uint8Array> => {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) return controller.close();
      controller.enqueue(bytes.slice(offset, offset + chunkSize));
      offset += chunkSize;
    },
  });
};

const collect = async (s: ReadableStream<string>): Promise<string[]> => {
  const out: string[] = [];
  const reader = s.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out.push(value);
  }
};

describe("groqTextDeltas — real streamed answer, split at arbitrary byte boundaries", () => {
  it.each([7, 64, 1_000, 100_000])("reassembles the answer with %i-byte chunks", async (size) => {
    const deltas = await collect(groqTextDeltas(streamOf(fixture, size)));
    const text = deltas.join("");
    expect(text).toMatch(/^Bitcoin/);
    expect(text.length).toBeGreaterThan(100);
    expect(deltas.every((d) => d.length > 0)).toBe(true);
  });

  it("rejects a chunk that is not a chat completion chunk", async () => {
    const reader = groqTextDeltas(streamOf('data: {"unexpected":true}\n\n', 64)).getReader();
    await expect(reader.read()).rejects.toBeInstanceOf(ContractError);
  });
});
