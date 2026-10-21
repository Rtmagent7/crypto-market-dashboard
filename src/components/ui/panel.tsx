import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PanelProps {
  id: string;
  title: string;
  /** Muted meta next to the title, e.g. "Updated 3 min ago · CoinGecko". */
  meta?: ReactNode;
  actions?: ReactNode;
  /** Slot for the Freshness Rail (Sprint 2). Defaults to an idle, static rail. */
  rail?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Data panel shell: 10 px radius, separated from the page by surface contrast (no border),
 * and a container-query context so contents adapt to the panel's own width.
 */
export function Panel({
  id,
  title,
  meta,
  actions,
  rail,
  className,
  children,
}: PanelProps): ReactNode {
  const titleId = `${id}-title`;

  return (
    <section
      aria-labelledby={titleId}
      className={cn("@container relative overflow-hidden rounded-panel bg-surface", className)}
    >
      {rail ?? <div aria-hidden className="h-0.5 w-full bg-line" />}
      <div className="p-4 desktop:p-5">
        <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id={titleId} className="text-panel-title font-semibold">
            {title}
          </h2>
          {meta ? <p className="text-meta text-muted">{meta}</p> : null}
          {actions ? <div className="ml-auto">{actions}</div> : null}
        </header>
        {children}
      </div>
    </section>
  );
}
