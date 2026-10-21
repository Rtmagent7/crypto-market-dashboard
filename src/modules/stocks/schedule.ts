import { MARKET } from "@/config/market-hours";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const partsFormatter = new Map<string, Intl.DateTimeFormat>();
const formatterFor = (timeZone: string): Intl.DateTimeFormat => {
  let f = partsFormatter.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsFormatter.set(timeZone, f);
  }
  return f;
};

const wallParts = (ms: number, timeZone: string): Record<string, string> =>
  Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(ms)
      .map((p) => [p.type, p.value]),
  );

/** Offset of `timeZone` from UTC at instant `ms`, in milliseconds. */
const offsetMs = (ms: number, timeZone: string): number => {
  const p = wallParts(ms, timeZone);
  const wall = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return wall - Math.floor(ms / 1000) * 1000;
};

/** "2026-10-21 09:30:00" in `timeZone` → ISO UTC. Handles DST by re-checking the offset. */
export const zonedLocalToUtc = (local: string, timeZone: string): string => {
  const [date, time = "00:00:00"] = local.split(" ");
  const [y, mo, d] = date!.split("-").map(Number);
  const [h, mi, s = 0] = time.split(":").map(Number);
  const wall = Date.UTC(y!, mo! - 1, d!, h!, mi!, s);
  let utc = wall - offsetMs(wall, timeZone);
  utc = wall - offsetMs(utc, timeZone);
  return new Date(utc).toISOString();
};

const zonedDate = (ms: number, timeZone: string): string => {
  const p = wallParts(ms, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
};

/** Seconds until the next minute-of-hour slot, at least one minute away (Twelve Data batches). */
export const secondsUntilNextMinuteSlot = (now: number, slots: readonly number[]): number => {
  const startOfMinute = Math.floor(now / MINUTE_MS) * MINUTE_MS;
  for (let step = 1; step <= 61; step++) {
    const candidate = startOfMinute + step * MINUTE_MS;
    if (slots.includes(new Date(candidate).getUTCMinutes()) && candidate - now >= MINUTE_MS) {
      return Math.round((candidate - now) / 1000);
    }
  }
  return 3_600;
};

/** Seconds until the next "HH:mm" wall-clock time in `timeZone` (today if still ahead). */
export const secondsUntilNextZonedTime = (now: number, hhmm: string, timeZone: string): number => {
  for (let day = 0; day <= 2; day++) {
    const candidate = Date.parse(
      zonedLocalToUtc(`${zonedDate(now + day * DAY_MS, timeZone)} ${hhmm}:00`, timeZone),
    );
    if (candidate > now) return Math.ceil((candidate - now) / 1000);
  }
  return 86_400;
};

/** Next regular-session open (weekdays only; holidays are left to `is_market_open`). */
export const nextMarketOpen = (now: number): Date => {
  for (let day = 0; day <= 7; day++) {
    const ms = now + day * DAY_MS;
    const weekday = wallParts(ms, MARKET.timeZone).weekday;
    if (weekday === "Sat" || weekday === "Sun") continue;
    const open = Date.parse(
      zonedLocalToUtc(`${zonedDate(ms, MARKET.timeZone)} ${MARKET.open}:00`, MARKET.timeZone),
    );
    if (open > now) return new Date(open);
  }
  return new Date(now + DAY_MS);
};
