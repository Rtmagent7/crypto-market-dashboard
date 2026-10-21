import { describe, expect, it } from "vitest";

import {
  nextMarketOpen,
  secondsUntilNextMinuteSlot,
  secondsUntilNextZonedTime,
  zonedLocalToUtc,
} from "./schedule";

const at = (iso: string): number => Date.parse(iso);

describe("secondsUntilNextMinuteSlot", () => {
  it("waits for the next :00/:20/:40", () => {
    expect(secondsUntilNextMinuteSlot(at("2026-10-21T14:07:30Z"), [0, 20, 40])).toBe(12 * 60 + 30);
    expect(secondsUntilNextMinuteSlot(at("2026-10-21T14:45:00Z"), [0, 20, 40])).toBe(15 * 60);
  });

  it("never returns less than a minute (a slot that is now counts as the next one)", () => {
    expect(secondsUntilNextMinuteSlot(at("2026-10-21T14:20:00Z"), [0, 20, 40])).toBe(20 * 60);
    expect(secondsUntilNextMinuteSlot(at("2026-10-21T14:04:30Z"), [5])).toBe(30 + 60 * 60);
  });
});

describe("zonedLocalToUtc", () => {
  it("converts exchange-local times to UTC across DST", () => {
    expect(zonedLocalToUtc("2026-10-21 09:30:00", "America/New_York")).toBe(
      "2026-10-21T13:30:00.000Z",
    ); // EDT
    expect(zonedLocalToUtc("2026-12-01 09:30:00", "America/New_York")).toBe(
      "2026-12-01T14:30:00.000Z",
    ); // EST
  });
});

describe("secondsUntilNextZonedTime", () => {
  it("counts to 16:15 New York today, or tomorrow once it has passed", () => {
    expect(secondsUntilNextZonedTime(at("2026-10-21T19:00:00Z"), "16:15", "America/New_York")).toBe(
      75 * 60,
    );
    expect(secondsUntilNextZonedTime(at("2026-10-21T21:00:00Z"), "16:15", "America/New_York")).toBe(
      23 * 3600 + 15 * 60,
    );
  });
});

describe("nextMarketOpen", () => {
  it("is today's 09:30 New York before the open", () => {
    expect(nextMarketOpen(at("2026-10-21T12:00:00Z")).toISOString()).toBe(
      "2026-10-21T13:30:00.000Z",
    );
  });

  it("skips to Monday after Friday's close (EST after the November DST change)", () => {
    // Friday 2026-11-06 21:00 UTC is after the close → Monday 2026-11-09 09:30 EST = 14:30 UTC.
    expect(nextMarketOpen(at("2026-11-06T21:00:00Z")).toISOString()).toBe(
      "2026-11-09T14:30:00.000Z",
    );
  });

  it("shows 21:30 WITA during EDT and 22:30 WITA during EST (spec §4)", () => {
    const wita = (d: Date): string =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Makassar",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    expect(wita(nextMarketOpen(at("2026-10-21T12:00:00Z")))).toBe("21:30");
    expect(wita(nextMarketOpen(at("2026-12-01T12:00:00Z")))).toBe("22:30");
  });
});
