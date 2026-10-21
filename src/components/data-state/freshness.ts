/** Share of the TTL still left, 1 = just refreshed, 0 = refresh due (spec 9A Freshness Rail). */
export const railFraction = ({
  fetchedAt,
  nextRefreshAt,
  now,
}: {
  fetchedAt: number;
  nextRefreshAt: number;
  now: number;
}): number => {
  const ttl = nextRefreshAt - fetchedAt;
  if (ttl <= 0) return 0;
  return Math.min(1, Math.max(0, (nextRefreshAt - now) / ttl));
};

/** "Updated 3 min ago" copy (spec 9A copy rules: what users understand, not "TTL"). */
export const relativeAge = (thenMs: number, nowMs: number): string => {
  const seconds = Math.max(0, Math.round((nowMs - thenMs) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
};

/** Clock time in WITA for stale badges: "data as of 14:20 WITA". */
export const witaTime = (ms: number): string =>
  `${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" }).format(ms)} WITA`;
