import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Pulse strip shell, shared by the live strip and its skeleton so both have identical
 * geometry (CLS-safe). Mobile: horizontal scroll with snap; tablet 2×2; desktop one row.
 */
export function PulseStrip({
  rail,
  meta,
  children,
}: {
  rail?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}): ReactNode {
  return (
    <section
      aria-labelledby="pulse-title"
      className="overflow-hidden rounded-panel bg-surface [grid-area:pulse]"
    >
      {rail ?? <div aria-hidden className="h-0.5 w-full bg-line" />}
      <div className="flex items-start gap-4 px-4 py-4 desktop:px-5">
        <h2 id="pulse-title" className="sr-only">
          Market pulse
        </h2>
        <dl className="flex min-w-0 flex-1 snap-x snap-mandatory gap-6 overflow-x-auto tablet:grid tablet:grid-cols-2 tablet:overflow-visible desktop:grid-cols-4">
          {children}
        </dl>
        {meta ? <div className="hidden shrink-0 desktop:block">{meta}</div> : null}
      </div>
    </section>
  );
}

/** One figure: condensed number on top, muted label below (value null → em dash). */
export function PulseFigure({
  label,
  value,
  note,
  loading = false,
  children,
}: {
  label: string;
  value: string | null;
  note?: string;
  loading?: boolean;
  children?: ReactNode;
}): ReactNode {
  return (
    <div className="flex min-w-40 shrink-0 snap-start flex-col-reverse gap-1">
      <dt className="text-meta text-muted">
        {label}
        {note ? <span className="ml-1">· {note}</span> : null}
      </dt>
      <dd className="flex h-6 items-baseline gap-2 font-condensed text-2xl leading-6 font-semibold desktop:h-9 desktop:text-pulse">
        {loading ? (
          <>
            <Skeleton className="h-5 w-28 self-center desktop:h-7" />
            <span className="sr-only">Loading</span>
          </>
        ) : value === null ? (
          <>
            <span aria-hidden className="text-muted">
              —
            </span>
            <span className="sr-only">Not available</span>
          </>
        ) : (
          <>
            <span>{value}</span>
            {children ? <span className="font-sans text-meta">{children}</span> : null}
          </>
        )}
      </dd>
    </div>
  );
}
