"use client";

import { useEffect } from "react";

import { useUiStore } from "@/stores/ui.store";

/** Mirrors the persisted theme preference onto <html data-theme>; "system" removes it. */
export function ThemeSync(): null {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  return null;
}
