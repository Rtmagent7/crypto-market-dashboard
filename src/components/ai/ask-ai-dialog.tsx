"use client";

import { useId, useState, type FormEvent, type ReactNode, type RefObject } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAskAi } from "@/hooks/use-ask-ai";
import { cn } from "@/lib/utils";

export const ASK_DISCLAIMER =
  "Answers use the dashboard's current market data only. Educational information, not financial advice.";

const MIN = 3;
const MAX = 500;

/** Ask AI (spec §11): lazy-loaded, plain-text answers streamed with a caret, 5 questions a day. */
export function AskAiDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Focus returns here on close (the dialog is controlled, so radix has no trigger of its own). */
  trigger: RefObject<HTMLButtonElement | null>;
}): ReactNode {
  const { state, ask, reset } = useAskAi();
  const [question, setQuestion] = useState("");
  const inputId = useId();
  const hintId = useId();
  const trimmed = question.trim();
  const busy = state.status === "streaming";

  const submit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (trimmed.length >= MIN && !busy) void ask(trimmed);
  };

  const close = (next: boolean): void => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          trigger.current?.focus();
        }}
        className="gap-4 rounded-panel bg-surface-raised p-5 text-text ring-line sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="text-panel-title font-semibold">
            Ask AI about the market
          </DialogTitle>
          <DialogDescription className="text-meta text-muted">{ASK_DISCLAIMER}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor={inputId} className="text-cell font-medium">
            Your question
          </label>
          <textarea
            id={inputId}
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            aria-describedby={hintId}
            rows={3}
            maxLength={MAX}
            placeholder="Why is Bitcoin dominance where it is today?"
            className="resize-none rounded-control border border-control-border bg-surface px-3 py-2 text-cell placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-solid"
          />
          <div className="flex items-center justify-between gap-3">
            <p id={hintId} className="text-meta text-muted tabular-nums">
              {trimmed.length}/{MAX} · 5 questions a day
            </p>
            <button
              type="submit"
              disabled={busy || trimmed.length < MIN}
              className="min-h-11 rounded-control bg-accent px-4 text-cell font-medium text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid disabled:opacity-50"
            >
              {busy ? "Answering…" : "Ask"}
            </button>
          </div>
        </form>

        <Answer state={state} />
      </DialogContent>
    </Dialog>
  );
}

function Answer({ state }: { state: ReturnType<typeof useAskAi>["state"] }): ReactNode {
  if (state.status === "idle") return null;
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-control bg-surface px-3 py-2 text-cell text-stale">
        {state.message}
      </p>
    );
  }
  const streaming = state.status === "streaming";
  return (
    <div className="flex flex-col gap-2">
      {/* Plain text only (React escapes it). The live region announces the finished answer once,
          not every token: it is only marked busy while streaming. */}
      <p
        aria-live="polite"
        aria-busy={streaming}
        className="max-h-72 overflow-y-auto rounded-control bg-surface px-3 py-2 text-cell leading-6 whitespace-pre-wrap"
      >
        {state.text}
        {streaming ? (
          <span
            aria-hidden
            className={cn(
              "ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-accent",
              "motion-safe:animate-pulse",
            )}
          />
        ) : null}
      </p>
      {state.status === "done" ? (
        <p className="text-meta text-muted">
          {state.remaining === 1 ? "1 question" : `${state.remaining} questions`} left today
        </p>
      ) : null}
    </div>
  );
}
