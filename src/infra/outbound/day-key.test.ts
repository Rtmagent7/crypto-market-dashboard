import { describe, expect, it } from "vitest";

import { minuteKey, periodKey, periodTtlSeconds } from "./day-key";

const at = (iso: string): number => Date.parse(iso);

describe("periodKey", () => {
  it("returns the calendar day in the provider's reset timezone", () => {
    expect(periodKey("day", "UTC", at("2026-10-21T23:59:59Z"))).toBe("2026-10-21");
    expect(periodKey("day", "UTC", at("2026-10-22T00:00:00Z"))).toBe("2026-10-22");
  });

  it("rolls the day over at local midnight, not UTC midnight", () => {
    // 16:30 UTC is already 00:30 the next day in WITA (UTC+8).
    expect(periodKey("day", "Asia/Makassar", at("2026-10-21T16:30:00Z"))).toBe("2026-10-22");
    // 03:00 UTC is still the previous day in New York (UTC-4 in October).
    expect(periodKey("day", "America/New_York", at("2026-10-21T03:00:00Z"))).toBe("2026-10-20");
  });

  it("returns year-month for monthly budgets", () => {
    expect(periodKey("month", "UTC", at("2026-10-31T23:59:59Z"))).toBe("2026-10");
    expect(periodKey("month", "UTC", at("2026-11-01T00:00:00Z"))).toBe("2026-11");
  });
});

describe("minuteKey", () => {
  it("buckets by UTC minute", () => {
    expect(minuteKey(at("2026-10-21T14:05:59.999Z"))).toBe("2026-10-21T14:05");
    expect(minuteKey(at("2026-10-21T14:06:00Z"))).toBe("2026-10-21T14:06");
  });
});

describe("periodTtlSeconds", () => {
  it("keeps counters past the period end so /status can still read them", () => {
    expect(periodTtlSeconds("day")).toBeGreaterThan(86_400);
    expect(periodTtlSeconds("month")).toBeGreaterThan(31 * 86_400);
  });
});
