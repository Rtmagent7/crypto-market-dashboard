import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { useAskAi } from "./use-ask-ai";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const URL = "http://localhost:3000/api/ai/chat";
const sse = (body: string): HttpResponse<string> =>
  new HttpResponse(body, { headers: { "content-type": "text/event-stream" } });

describe("useAskAi", () => {
  it("streams deltas and ends with the cleaned answer and remaining questions", async () => {
    let sent: unknown;
    server.use(
      http.post(URL, async ({ request }) => {
        sent = await request.json();
        return sse(
          'event: delta\ndata: {"text":"**Bitcoin**"}\n\nevent: delta\ndata: {"text":" leads."}\n\n' +
            'event: done\ndata: {"text":"Bitcoin leads.","remaining":4}\n\n',
        );
      }),
    );
    const { result } = renderHook(() => useAskAi());
    await act(() => result.current.ask("How is BTC?"));
    expect(sent).toEqual({ question: "How is BTC?" });
    expect(result.current.state).toEqual({ status: "done", text: "Bitcoin leads.", remaining: 4 });
  });

  it("shows the server's message for limits and outages", async () => {
    server.use(
      http.post(URL, () =>
        HttpResponse.json({ error: "You have asked 5 questions today." }, { status: 429 }),
      ),
    );
    const { result } = renderHook(() => useAskAi());
    await act(() => result.current.ask("How is BTC?"));
    expect(result.current.state).toEqual({
      status: "error",
      message: "You have asked 5 questions today.",
    });
  });

  it("reports a stream that breaks before `done`", async () => {
    server.use(http.post(URL, () => sse('event: delta\ndata: {"text":"Bit"}\n\n')));
    const { result } = renderHook(() => useAskAi());
    await act(() => result.current.ask("How is BTC?"));
    expect(result.current.state.status).toBe("error");
  });

  it("reset returns to idle", async () => {
    server.use(http.post(URL, () => sse('event: error\ndata: {"error":"down"}\n\n')));
    const { result } = renderHook(() => useAskAi());
    await act(() => result.current.ask("How is BTC?"));
    expect(result.current.state).toEqual({ status: "error", message: "down" });
    act(() => result.current.reset());
    expect(result.current.state).toEqual({ status: "idle" });
  });
});
