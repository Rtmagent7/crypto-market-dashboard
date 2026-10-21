"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";

import { TABLE_VIEWPORT } from "./coin-table";

const COLUMNS = ["#", "Coin", "Price", "24h", "7d", "Market cap"] as const;
const PLACEHOLDER_ROWS = 15;
const CELL_WIDTHS = ["w-16", "w-12", "w-24", "w-16"] as const;

/** Loading state for the top-50 table: real header, fixed 36 / 48 px rows (CLS-safe). */
export function CoinTableSkeleton(): ReactNode {
  const density = useUiStore((s) => s.density);
  const rowHeight = density === "compact" ? "h-9" : "h-12";

  return (
    <div className={cn("overflow-hidden", TABLE_VIEWPORT)}>
      <table className="w-full border-collapse text-cell">
        <caption className="sr-only">Top 50 coins by market cap (loading)</caption>
        <thead className="sticky top-0 bg-surface-raised font-condensed text-meta font-medium text-muted">
          <tr>
            {COLUMNS.map((col, i) => (
              <th
                key={col}
                scope="col"
                className={cn("h-9 px-2 font-medium", i < 2 ? "text-left" : "text-right")}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: PLACEHOLDER_ROWS }, (_, row) => (
            <tr key={row} className={rowHeight}>
              <td className="w-8 px-2">
                <Skeleton className="h-3 w-4" />
              </td>
              <td className="px-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </td>
              {CELL_WIDTHS.map((width, i) => (
                <td key={i} className="px-2">
                  <Skeleton className={cn("ml-auto h-3", width)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
