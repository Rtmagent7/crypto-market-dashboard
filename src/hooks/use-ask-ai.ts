"use client";

import { useCallback, useRef, useState } from "react";
import { z } from "zod";

import { readSseEvents } from "@/lib/sse";

export type AskState =
  | { status: "idle" }
  | { status: "streaming"; text: string }
  | { status: "done"; text: string; remaining: number }
  | { status: "error"; message: string };

const Delta = z.object({ text: z.string() });
const Done = z.object({ text: z.string(), remaining: z.number().int() });
const Failure = z.object({ error: z.string() });

const GENERIC_ERROR = "Ask AI is not available right now. Try again in a few minutes.";

/** POST /api/ai/chat and render the answer as it streams in. One question at a time. */
export function useAskAi(): {
  state: AskState;
  ask: (question: string) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<AskState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  const reset = useCallback((): void => {
    controller.current?.abort();
    controller.current = null;
    setState({ status: "idle" });
  }, []);

  const ask = useCallback(async (question: string): Promise<void> => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setState({ status: "streaming", text: "" });
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        const failure = Failure.safeParse(await res.json().catch(() => null));
        setState({
          status: "error",
          message: failure.success ? failure.data.error : GENERIC_ERROR,
        });
        return;
      }
      let text = "";
      for await (const { event, data } of readSseEvents(res.body)) {
        if (event === "delta") {
          const delta = Delta.safeParse(data);
          if (delta.success) setState({ status: "streaming", text: (text += delta.data.text) });
        } else if (event === "done") {
          const done = Done.safeParse(data);
          if (done.success) setState({ status: "done", ...done.data });
          return;
        } else if (event === "error") {
          const failure = Failure.safeParse(data);
          setState({
            status: "error",
            message: failure.success ? failure.data.error : GENERIC_ERROR,
          });
          return;
        }
      }
      setState({ status: "error", message: GENERIC_ERROR });
    } catch {
      // An abort (dialog closed or a new question) is not an error worth showing.
      if (!abort.signal.aborted) setState({ status: "error", message: GENERIC_ERROR });
    }
  }, []);

  return { state, ask, reset };
}
