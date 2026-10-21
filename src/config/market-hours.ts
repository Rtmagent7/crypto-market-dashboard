/** NYSE regular session (spec §9A Stocks). Holidays are not modeled: is_market_open decides. */
export const MARKET = {
  timeZone: "America/New_York",
  open: "09:30",
  close: "16:00",
  /** Local time shown in the session bar ("opens 21:30 WITA"). */
  displayTimeZone: "Asia/Makassar",
  displayZoneLabel: "WITA",
} as const;
