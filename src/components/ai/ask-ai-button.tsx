"use client";

import dynamic from "next/dynamic";
import { useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import type * as DialogModule from "./ask-ai-dialog";

const loadDialog = (): Promise<typeof DialogModule> => import("./ask-ai-dialog");

// The dialog (radix, form, SSE reader) is not part of the Overview bundle: it loads on first
// intent (hover, focus or tap), so it costs nothing until someone wants to ask.
const AskAiDialog = dynamic(() => loadDialog().then((m) => m.AskAiDialog), { ssr: false });

export const ASK_TRIGGER_CLASS =
  "inline-flex min-h-11 items-center rounded-control border border-control-border px-3 text-cell font-medium";

export function AskAiButton(): ReactNode {
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const prefetch = (): void => void loadDialog();

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={() => {
          setWanted(true);
          setOpen(true);
        }}
        className={cn(
          ASK_TRIGGER_CLASS,
          "hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid",
        )}
      >
        Ask AI
      </button>
      {wanted ? <AskAiDialog open={open} onOpenChange={setOpen} trigger={trigger} /> : null}
    </>
  );
}

/** Same box as the button, for the Suspense skeleton (no layout shift when the brief arrives). */
export function AskAiButtonPlaceholder(): ReactNode {
  return (
    <span aria-hidden className={cn(ASK_TRIGGER_CLASS, "text-muted")}>
      Ask AI
    </span>
  );
}
