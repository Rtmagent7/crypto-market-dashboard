"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useUiStore, type Density } from "@/stores/ui.store";

const OPTIONS: readonly { value: Density; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

export function DensityToggle(): ReactNode {
  const density = useUiStore((s) => s.density);
  const toggleDensity = useUiStore((s) => s.toggleDensity);

  return (
    <div
      role="group"
      aria-label="Row density"
      className="inline-flex rounded-control border border-control-border p-0.5"
    >
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={density === value}
          onClick={() => density !== value && toggleDensity()}
          className={cn(
            "min-h-8 rounded-sm px-2.5 text-meta",
            density === value
              ? "bg-surface-raised font-medium text-text"
              : "text-muted hover:text-text",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
