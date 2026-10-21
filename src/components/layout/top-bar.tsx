"use client";

import { Waves } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { NAV_ITEMS, isActive } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

/** Tablet (768–1279 px) top bar with inline nav; on mobile it keeps only brand + theme. */
export function TopBar(): ReactNode {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 bg-nav px-4 desktop:hidden">
      <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold">
        <Waves aria-hidden className="size-6 text-accent" />
        Tidewater
      </Link>
      <nav aria-label="Main" className="hidden flex-1 tablet:block">
        <ul className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-control px-3 text-cell",
                    active ? "font-medium text-accent" : "text-muted hover:text-text",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <ThemeToggle className="ml-auto" />
    </header>
  );
}
