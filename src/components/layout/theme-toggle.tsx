"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { nextTheme, useUiStore, type ThemePreference } from "@/stores/ui.store";

const META = {
  system: { icon: Monitor, label: "System theme" },
  light: { icon: Sun, label: "Light theme" },
  dark: { icon: Moon, label: "Dark theme" },
} as const satisfies Record<ThemePreference, { icon: LucideIcon; label: string }>;

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}): ReactNode {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const { icon: Icon, label } = META[theme];
  const next = META[nextTheme(theme)].label.toLowerCase();

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme(theme))}
      aria-label={`${label}. Switch to ${next}`}
      title={`Switch to ${next}`}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center gap-3 rounded-control px-3 text-cell text-muted hover:bg-surface-raised hover:text-text",
        className,
      )}
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      {showLabel ? <span className="nav-label whitespace-nowrap">{label}</span> : null}
    </button>
  );
}
