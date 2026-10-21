"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { formatChange } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE = { up: "text-up", down: "text-down", flat: "text-muted" } as const;
// Literal class names so Tailwind can see them; motion-safe skips the flash for reduced motion.
const FLASH = { up: "motion-safe:bg-up-tint", down: "motion-safe:bg-down-tint", flat: "" } as const;

/**
 * "▲ +1.84%" / "▼ −0.62%" (spec 9A). When a polled value changes, the cell flashes the
 * matching tint for 700 ms; with reduced motion the flash is skipped by CSS.
 */
export function ChangeCell({ pct }: { pct: number | null }): ReactNode {
  const { direction, arrow, text } = formatChange(pct);
  const previous = useRef(pct);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (previous.current === pct) return;
    previous.current = pct;
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(id);
  }, [pct]);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-1 rounded-sm px-1 font-medium whitespace-nowrap",
        TONE[direction],
        flash && FLASH[direction],
      )}
    >
      {arrow ? <span aria-hidden>{arrow}</span> : null}
      {text}
    </span>
  );
}
