"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactNode {
  return (
    <section className="max-w-prose rounded-panel bg-surface p-5" aria-labelledby="error-title">
      <h1 id="error-title" className="text-page-title font-semibold">
        This page failed to load.
      </h1>
      <p className="mt-2 text-muted">
        Try again, or check{" "}
        <Link
          href="/status"
          className="text-accent underline underline-offset-2 hover:decoration-2"
        >
          provider status
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex min-h-11 items-center rounded-control bg-accent px-4 font-medium text-on-accent"
      >
        Try again
      </button>
    </section>
  );
}
