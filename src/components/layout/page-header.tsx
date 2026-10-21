import type { ReactNode } from "react";

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <header className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1 className="text-page-title font-semibold">{title}</h1>
      {children ? <p className="text-meta text-muted">{children}</p> : null}
    </header>
  );
}
