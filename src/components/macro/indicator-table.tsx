import type { ReactNode } from "react";

import { Sparkline } from "@/components/charts/sparkline";
import { MACRO_COUNTRY, MACRO_FROM_YEAR } from "@/config/macro";
import { formatIndicator } from "@/lib/format";
import type { MacroIndicator, PricePoint } from "@/modules/shared/domain";

const Value = ({
  point,
  unit,
}: {
  point: PricePoint | undefined;
  unit: MacroIndicator["unit"];
}): ReactNode =>
  point ? (
    <>
      <span className="block font-medium">{formatIndicator(unit, point.v)}</span>
      <span className="block text-meta text-muted">{point.t}</span>
    </>
  ) : (
    <span className="text-muted">—</span>
  );

/** Rates go from 5.1% to 1.9%: say that, rather than "down 62%". */
const trendLabel = ({ label, unit, history }: MacroIndicator): string => {
  const first = history[0]!;
  const last = history.at(-1)!;
  return `${label}, ${first.t}–${last.t}: from ${formatIndicator(unit, first.v)} to ${formatIndicator(unit, last.v)}`;
};

/** Annual indicators as a plain table (spec 9A: the table is the hero). Server-rendered. */
export function IndicatorTable({ indicators }: { indicators: MacroIndicator[] }): ReactNode {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-cell">
        <caption className="sr-only">
          {MACRO_COUNTRY.name} macro indicators: latest annual value, the year before, and the trend
          since {MACRO_FROM_YEAR}
        </caption>
        <thead className="bg-surface-raised font-condensed text-meta text-muted">
          <tr>
            <th scope="col" className="h-9 px-2 text-left font-medium">
              Indicator
            </th>
            <th scope="col" className="h-9 px-2 text-right font-medium">
              Latest
            </th>
            <th scope="col" className="h-9 px-2 text-right font-medium @max-[30rem]:hidden">
              Year before
            </th>
            <th scope="col" className="h-9 w-28 px-2 text-right font-medium">
              Since {MACRO_FROM_YEAR}
            </th>
          </tr>
        </thead>
        <tbody>
          {indicators.map((i) => (
            <tr key={i.id} className="border-b border-line/60 align-top last:border-0">
              <th scope="row" className="px-2 py-3 text-left font-normal">
                <span className="block font-medium">{i.label}</span>
                <span className="block text-meta text-muted">{i.description}</span>
              </th>
              <td className="px-2 py-3 text-right whitespace-nowrap tabular-nums">
                <Value point={i.history.at(-1)} unit={i.unit} />
              </td>
              <td className="px-2 py-3 text-right whitespace-nowrap tabular-nums @max-[30rem]:hidden">
                <Value point={i.history.at(-2)} unit={i.unit} />
              </td>
              <td className="px-2 py-3 text-right">
                <Sparkline
                  values={i.history.map((p) => p.v)}
                  period={`${MACRO_FROM_YEAR}–present`}
                  label={i.history.length > 0 ? trendLabel(i) : undefined}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
