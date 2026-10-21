import Link from "next/link";
import type { ReactNode } from "react";

/** Unavailable state (spec 9A): one sentence of what happened and what to do. No apology. */
export function Unavailable({ what, className }: { what: string; className?: string }): ReactNode {
  return (
    <div role="status" className={className ?? "flex h-full min-h-24 items-center"}>
      <p className="text-cell text-muted">
        {what} temporarily unavailable.{" "}
        <Link
          href="/status"
          className="text-accent underline underline-offset-2 hover:decoration-2"
        >
          Check provider status
        </Link>
        .
      </p>
    </div>
  );
}
