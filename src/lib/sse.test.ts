import { describe, expect, it } from "vitest";

import { readSseEvents } from "./sse";

const streamOf = (chunks: string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start: (controller) => {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
};

const collect = async (chunks: string[]): Promise<{ event: string; data: unknown }[]> => {
  const out: { event: string; data: unknown }[] = [];
  for await (const e of readSseEvents(streamOf(chunks))) out.push(e);
  return out;
};

describe("readSseEvents", () => {
  const wire =
    'event: delta\ndata: {"text":"Bit"}\n\nevent: delta\ndata: {"text":"coin"}\n\n' +
    'event: done\ndata: {"text":"Bitcoin","remaining":4}\n\n';
  const expected = [
    { event: "delta", data: { text: "Bit" } },
    { event: "delta", data: { text: "coin" } },
    { event: "done", data: { text: "Bitcoin", remaining: 4 } },
  ];

  it("parses events split at any byte boundary", async () => {
    expect(await collect([wire])).toEqual(expected);
    expect(await collect(wire.split(""))).toEqual(expected);
    expect(await collect([wire.slice(0, 13), wire.slice(13, 50), wire.slice(50)])).toEqual(
      expected,
    );
  });

  it("skips comments and events without JSON data", async () => {
    expect(await collect([": ping\n\nevent: delta\ndata: not-json\n\n", wire])).toEqual(expected);
  });
});
