"use client";

import Image from "next/image";
import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Sparkline } from "@/components/charts/sparkline";
import { formatCompactUsd, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CryptoAsset } from "@/modules/shared/domain";
import { useUiStore } from "@/stores/ui.store";

import { ChangeCell } from "./change-cell";

type SortKey = "rank" | "name" | "priceUsd" | "change24hPct" | "marketCapUsd";
type Sort = { key: SortKey; dir: "asc" | "desc" };

const COLUMNS: readonly {
  key: SortKey | null;
  label: string;
  numeric: boolean;
  className?: string;
}[] = [
  { key: "rank", label: "#", numeric: false, className: "w-10" },
  // The coin column takes the remaining width; numeric columns shrink to their content.
  { key: "name", label: "Coin", numeric: false, className: "w-full" },
  { key: "priceUsd", label: "Price", numeric: true, className: "w-px whitespace-nowrap" },
  { key: "change24hPct", label: "24h", numeric: true, className: "w-px whitespace-nowrap" },
  { key: null, label: "7d", numeric: true, className: "w-28 @max-[30rem]:hidden" },
  {
    key: "marketCapUsd",
    label: "Market cap",
    numeric: true,
    className: "w-px whitespace-nowrap @max-[38rem]:hidden",
  },
];

/** Table body height is fixed so the swap from skeleton to data never shifts layout (CLS). */
export const TABLE_VIEWPORT = "h-[560px]";

const compare = (a: CryptoAsset, b: CryptoAsset, { key, dir }: Sort): number => {
  const sign = dir === "asc" ? 1 : -1;
  if (key === "name") return sign * a.name.localeCompare(b.name);
  const av = a[key] ?? Number.NEGATIVE_INFINITY;
  const bv = b[key] ?? Number.NEGATIVE_INFINITY;
  return sign * (av - bv);
};

/**
 * Top-50 table (spec 9A): sortable headers with aria-sort, numeric columns right-aligned,
 * keyboard navigation through ONE delegated listener on <tbody>, density toggle.
 */
export function CoinTable({ coins }: { coins: readonly CryptoAsset[] }): ReactNode {
  const density = useUiStore((s) => s.density);
  const [sort, setSort] = useState<Sort>({ key: "rank", dir: "asc" });
  const deferredSort = useDeferredValue(sort); // keeps INP low while 50 rows re-sort
  const rows = useMemo(
    () => [...coins].sort((a, b) => compare(a, b, deferredSort)),
    [coins, deferredSort],
  );
  const tbody = useRef<HTMLTableSectionElement>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  const toggleSort = (key: SortKey): void =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "rank" || key === "name" ? "asc" : "desc" },
    );

  // Event delegation: one handler for every row instead of 50 listeners.
  const onKeyDown = (e: KeyboardEvent<HTMLTableSectionElement>): void => {
    const all = Array.from(tbody.current?.rows ?? []);
    const current = all.indexOf((e.target as HTMLElement).closest("tr") as HTMLTableRowElement);
    if (current === -1) return;
    const next =
      e.key === "ArrowDown"
        ? Math.min(all.length - 1, current + 1)
        : e.key === "ArrowUp"
          ? Math.max(0, current - 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? all.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    setFocusIndex(next);
    all[next]?.focus();
  };

  const rowHeight = density === "compact" ? "h-9" : "h-12";

  return (
    <div className={cn("overflow-auto", TABLE_VIEWPORT)}>
      <table className="w-full border-collapse text-cell">
        <caption className="sr-only">
          Top 50 cryptocurrencies by market cap. Use the column headers to sort and the arrow keys
          to move between rows.
        </caption>
        <thead className="sticky top-0 z-10 bg-surface-raised font-condensed text-meta text-muted">
          <tr>
            {COLUMNS.map(({ key, label, numeric, className }) => {
              const active = key !== null && sort.key === key;
              return (
                <th
                  key={label}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(
                    "h-9 px-2 font-medium",
                    numeric ? "text-right" : "text-left",
                    className,
                  )}
                >
                  {key === null ? (
                    label
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className={cn(
                        "inline-flex min-h-8 items-center gap-1 rounded-sm hover:text-text",
                        numeric && "flex-row-reverse",
                        active && "text-text",
                      )}
                    >
                      {label}
                      <span aria-hidden className={cn("text-[10px]", !active && "invisible")}>
                        {sort.dir === "asc" ? "▲" : "▼"}
                      </span>
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody ref={tbody} onKeyDown={onKeyDown}>
          {rows.map((c, i) => (
            <tr
              key={c.id}
              tabIndex={i === focusIndex ? 0 : -1}
              onFocus={() => setFocusIndex(i)}
              className={cn(
                rowHeight,
                "border-b border-line/60 outline-none hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
              )}
            >
              <td className="px-2 text-muted tabular-nums">{c.rank || "—"}</td>
              <th scope="row" className="max-w-0 px-2 text-left font-normal">
                <div className="flex min-w-0 items-center gap-2">
                  <Image
                    src={c.imageUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 shrink-0 rounded-full"
                  />
                  {/* Narrow containers (phones) lead with the symbol; the name stays for AT. */}
                  <span className="truncate font-medium @max-[30rem]:sr-only" title={c.name}>
                    {c.name}
                  </span>
                  <span className="shrink-0 text-meta text-muted @max-[30rem]:text-cell @max-[30rem]:font-medium @max-[30rem]:text-text">
                    {c.symbol}
                  </span>
                </div>
              </th>
              <td className="px-2 text-right font-medium whitespace-nowrap tabular-nums">
                {formatUsd(c.priceUsd)}
              </td>
              <td className="px-2 text-right tabular-nums">
                <ChangeCell pct={c.change24hPct} />
              </td>
              <td className="px-2 text-right @max-[30rem]:hidden">
                <Sparkline values={c.sparkline7d} />
              </td>
              <td className="px-2 text-right whitespace-nowrap tabular-nums @max-[38rem]:hidden">
                {formatCompactUsd(c.marketCapUsd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
