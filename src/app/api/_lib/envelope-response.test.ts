import { describe, expect, it } from "vitest";

import type { DataEnvelope } from "@/modules/shared/domain";

import { envelopeResponse } from "./envelope-response";

const NOW = Date.parse("2026-10-21T10:00:00Z");
const envelope = (
  status: DataEnvelope<number[]>["status"],
  refreshInSec: number,
): DataEnvelope<number[]> => ({
  data: status === "unavailable" ? null : [1],
  status,
  source: "coingecko",
  fetchedAt: new Date(NOW).toISOString(),
  nextRefreshAt: new Date(NOW + refreshInSec * 1000).toISOString(),
});

describe("envelopeResponse", () => {
  it("fresh → 200, CDN-cacheable until the data's next refresh", async () => {
    const res = envelopeResponse(envelope("fresh", 600), NOW);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=600, stale-while-revalidate=60",
    );
    expect(await res.json()).toMatchObject({ status: "fresh", data: [1] });
  });

  it("stale → 200 with a short CDN lifetime so recovery shows up quickly", () => {
    const res = envelopeResponse(envelope("stale", 60), NOW);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=60");
  });

  it("unavailable → 503 + Retry-After, never cached", async () => {
    const res = envelopeResponse(envelope("unavailable", 60), NOW);
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ status: "unavailable", data: null });
  });

  it("never sends a zero or negative max age for data that is about to refresh", () => {
    const res = envelopeResponse(envelope("fresh", -5), NOW);
    expect(res.headers.get("cache-control")).toContain("s-maxage=1,");
  });
});

describe("envelopeResponse — noStore", () => {
  it("never lets the CDN keep live status responses", () => {
    const res = envelopeResponse(envelope("fresh", 60), NOW, { noStore: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
