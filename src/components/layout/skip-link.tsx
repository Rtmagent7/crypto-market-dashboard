import type { ReactNode } from "react";

export function SkipLink(): ReactNode {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-control bg-accent px-4 py-2 font-medium text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to content
    </a>
  );
}
