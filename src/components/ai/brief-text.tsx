"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The brief as plain text (React escapes it; never HTML). On phones it collapses to three lines
 * with a "Read full brief" toggle (spec 9A). A new brief is announced politely, nothing else is.
 */
export function BriefText({ text }: { text: string }): ReactNode {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <p
        aria-live="polite"
        className={cn("max-w-[72ch] text-cell leading-6", !expanded && "max-tablet:line-clamp-3")}
      >
        {text}
      </p>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="min-h-11 self-start text-cell font-medium text-accent underline underline-offset-2 tablet:hidden"
      >
        {expanded ? "Show less" : "Read full brief"}
      </button>
    </div>
  );
}
