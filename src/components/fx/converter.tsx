"use client";

import { ArrowLeftRight } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { convert, currencyOptions } from "@/lib/fx-convert";
import type { FxRates } from "@/modules/shared/domain";

const DEBOUNCE_MS = 150;

const formatAmount = (value: number, currency: string): string =>
  new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value !== 0 && Math.abs(value) < 1 ? 6 : 2,
  }).format(value);

/** Closure-based debounce of the parsed amount: math stays instant, rendering stays calm. */
const useDebounced = <T,>(value: T, ms: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
};

/** Converter (spec 9A): two inputs, a swap button, pure client-side math on cached rates. */
export function Converter({ rates }: { rates: FxRates }): ReactNode {
  const options = useMemo(() => currencyOptions(rates), [rates]);
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("IDR");
  const debouncedAmount = useDebounced(amount, DEBOUNCE_MS);

  const parsed = Number(debouncedAmount.replace(/,/g, ""));
  const result = debouncedAmount.trim() === "" ? null : convert(parsed, from, to, rates);
  const unit = convert(1, from, to, rates);

  const select = "min-h-11 rounded-control border border-control-border bg-surface px-3 text-cell";
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => e.preventDefault()}
      aria-describedby="fx-result"
    >
      <div className="grid grid-cols-1 items-end gap-3 tablet:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fx-amount" className="text-meta text-muted">
            Amount
          </label>
          <div className="flex gap-2">
            <input
              id="fx-amount"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-h-11 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 text-lg tabular-nums"
            />
            <label htmlFor="fx-from" className="sr-only">
              From currency
            </label>
            <select
              id="fx-from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={select}
            >
              {options.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          className="inline-flex min-h-11 min-w-11 items-center justify-center self-end rounded-control border border-control-border text-muted hover:text-text"
        >
          <ArrowLeftRight aria-hidden className="size-4" />
          <span className="sr-only">Swap currencies</span>
        </button>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fx-to" className="text-meta text-muted">
            Converted to
          </label>
          <select
            id="fx-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={`${select} w-full`}
          >
            {options.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <output id="fx-result" htmlFor="fx-amount fx-from fx-to" className="flex flex-col gap-1">
        <span className="font-condensed text-pulse font-semibold tabular-nums">
          {result === null ? "—" : formatAmount(result, to)}
        </span>
        <span className="text-meta text-muted">
          {unit === null
            ? "Rate not available for this pair."
            : `1 ${from} = ${formatAmount(unit, to)} · ECB reference rate ${rates.date}`}
        </span>
      </output>
    </form>
  );
}
