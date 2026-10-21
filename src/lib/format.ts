// Number formatting (spec §9): en-US for USD, id-ID for IDR, tabular figures in CSS.

const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// Sub-dollar prices keep 6 significant digits: $0.999388, $0.00004213.
const usdSmall = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumSignificantDigits: 6,
});
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumSignificantDigits: 3,
});
const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const pct2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export const formatUsd = (value: number): string =>
  Math.abs(value) >= 1 ? usd2.format(value) : usdSmall.format(value);

export const formatCompactUsd = (value: number): string => usdCompact.format(value);

export const formatIdr = (value: number): string => idr.format(value);

export const formatPercent = (value: number): string => `${pct1.format(value)}%`;

export type Direction = "up" | "down" | "flat";

export interface FormattedChange {
  direction: Direction;
  arrow: "▲" | "▼" | "";
  text: string;
}

const MINUS = "−";

/** Up/down is never conveyed by color alone: arrow + explicit sign (true minus). */
export const formatChange = (pct: number | null): FormattedChange => {
  if (pct === null || !Number.isFinite(pct)) return { direction: "flat", arrow: "", text: "—" };
  const rounded = Math.round(pct * 100) / 100;
  if (rounded === 0) return { direction: "flat", arrow: "", text: `${pct2.format(0)}%` };
  return rounded > 0
    ? { direction: "up", arrow: "▲", text: `+${pct2.format(rounded)}%` }
    : { direction: "down", arrow: "▼", text: `${MINUS}${pct2.format(-rounded)}%` };
};

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const pctFixed1 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Macro indicator values: "5.1%" / "−0.6%" (true minus) or whole dollars. */
export const formatIndicator = (unit: "percent" | "usd", value: number): string =>
  unit === "usd"
    ? usd0.format(value)
    : `${Math.round(value * 10) < 0 ? MINUS : ""}${pctFixed1.format(Math.abs(value))}%`;
