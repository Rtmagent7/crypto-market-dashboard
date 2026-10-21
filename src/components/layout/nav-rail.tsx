"use client";

import { Waves } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { NAV_ITEMS, isActive } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

/**
 * Desktop (≥ 1280 px) 72 px icon rail. Expands to 220 px on hover or keyboard focus,
 * overlaying content so the page never reflows. Labels stay in the DOM as accessible names.
 */
export function NavRail(): ReactNode {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary"
      className="group/rail fixed inset-y-0 left-0 z-40 hidden w-rail flex-col overflow-hidden bg-nav py-4 focus-within:w-rail-open hover:w-rail-open motion-safe:transition-[width] motion-safe:duration-150 desktop:flex"
    >
      <Link
        href="/"
        className="mx-3 mb-6 flex min-h-11 items-center gap-3 rounded-control px-3 font-semibold"
      >
        <Waves aria-hidden className="size-6 shrink-0 text-accent" />
        <span className="whitespace-nowrap opacity-0 group-focus-within/rail:opacity-100 group-hover/rail:opacity-100">
          Tidewater
        </span>
      </Link>
      <nav aria-label="Main">
        <ul className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-control px-3 text-cell",
                    active
                      ? "bg-surface-raised font-medium text-accent"
                      : "text-muted hover:bg-surface-raised hover:text-text",
                  )}
                >
                  <Icon aria-hidden className="size-5 shrink-0" />
                  <span className="whitespace-nowrap opacity-0 group-focus-within/rail:opacity-100 group-hover/rail:opacity-100">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto px-3 [&_.nav-label]:opacity-0 group-focus-within/rail:[&_.nav-label]:opacity-100 group-hover/rail:[&_.nav-label]:opacity-100">
        <ThemeToggle showLabel className="w-full" />
      </div>
    </aside>
  );
}
