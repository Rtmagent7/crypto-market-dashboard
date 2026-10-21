/** Server-sent events from a fetch body: `event:` + one JSON `data:` line per event. */
export async function* readSseEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: unknown }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const event = /^event: ?(.*)$/m.exec(block)?.[1] ?? "message";
        const data = /^data: ?(.*)$/m.exec(block)?.[1];
        if (data === undefined) continue;
        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue; // not JSON: not one of ours
        }
        yield { event, data: parsed };
      }
      if (done) return;
    }
  } finally {
    reader.releaseLock();
  }
}
