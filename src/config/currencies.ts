/** Currencies kept in the 1-year FX history (Frankfurter `to=`). IDR first: the dashboard's home. */
export const FX_HISTORY_CURRENCIES = ["IDR", "EUR", "JPY", "SGD", "GBP"] as const;

export type HistoryCurrency = (typeof FX_HISTORY_CURRENCIES)[number];
