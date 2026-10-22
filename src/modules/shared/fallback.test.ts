import { describe, expect, it, vi } from "vitest";

import type { GateResult } from "./envelope";
import { withFallback } from "./fallback";

const NOW = Date.parse("2026-10-22T00:00:00Z");
const stale = (reason: string): GateResult<number> => ({
  status: "stale",
  data: 1,
  fetchedAt: NOW - 7 * 3_600_000,
  expiresAt: NOW - 3_600_000,
  reason,
});
const fresh: GateResult<number> = {
  status: "fresh",
  data: 2,
  fetchedAt: NOW,
  expiresAt: NOW + 3_600_000,
  cacheHit: false,
};

const run = (
  first: GateResult<number>,
): Promise<unknown> & { backup: ReturnType<typeof vi.fn> } => {
  const backup = vi.fn(async () => fresh);
  const result = withFallback(
    { provider: "frankfurter", load: async () => first, map: (n: number) => n },
    { provider: "exchangerate", load: backup, map: (n: number) => n },
    NOW,
  );
  return Object.assign(result, { backup });
};

describe("withFallback", () => {
  it("while the primary is being refreshed by another request, serves its stale data and leaves the backup alone", async () => {
    const call = run(stale("locked"));
    expect(await call).toMatchObject({ status: "stale", source: "frankfurter", data: 1 });
    expect(call.backup).not.toHaveBeenCalled();
  });

  it("when the primary failed, a fresh backup wins over stale primary data", async () => {
    const call = run(stale("provider-error"));
    expect(await call).toMatchObject({ status: "fresh", source: "exchangerate", data: 2 });
    expect(call.backup).toHaveBeenCalledOnce();
  });
});
