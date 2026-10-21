import Link from "next/link";
import type { ReactNode } from "react";

export default function NotFound(): ReactNode {
  return (
    <section className="max-w-prose rounded-panel bg-surface p-5" aria-labelledby="nf-title">
      <h1 id="nf-title" className="text-page-title font-semibold">
        Page not found.
      </h1>
      <p className="mt-2 text-muted">
        Only the top 10 coins have detail pages.{" "}
        <Link href="/" className="text-accent underline underline-offset-2 hover:decoration-2">
          Back to overview
        </Link>
      </p>
    </section>
  );
}
