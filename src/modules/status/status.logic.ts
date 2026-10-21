import { STATUS_PROVIDERS } from "@/config/providers";
import type { ProviderStatus } from "@/modules/shared/domain";

/** What the status repository reads from Redis for one provider. */
export interface RawProviderState {
  quotaUsed: number;
  breakerOpen: boolean;
  cooldown: boolean;
  fetchedAt: number | null;
  /** False when the provider needs an API key that is not set. */
  configured: boolean;
  /** The cap the gate enforces right now (BUDGET_CAP_RATIO already applied). */
  quotaCap: number;
  quotaPeriod: "day" | "month";
}

/** Above this share of the enforced cap a provider is flagged (spec §4: hard cap 80%). */
const DEGRADED_QUOTA_SHARE = 0.8;
/** Data older than 2 TTLs (+5 min of cron slack) means refreshes are failing. */
const staleAfterMs = (ttlSec: number): number => (2 * ttlSec + 300) * 1000;

const EMPTY: RawProviderState = {
  quotaUsed: 0,
  breakerOpen: false,
  cooldown: false,
  fetchedAt: null,
  configured: true,
  quotaCap: 1,
  quotaPeriod: "day",
};

/** Pure: Redis snapshot → what /status shows. The same numbers the guard enforces. */
export const computeStatuses = (
  raw: Record<string, RawProviderState>,
  { now }: { now: number },
): ProviderStatus[] => {
  const nameOf = new Map<string, string>(STATUS_PROVIDERS.map((p) => [p.id, p.name]));

  return STATUS_PROVIDERS.map((p) => {
    const r = raw[p.id] ?? EMPTY;
    const backup = p.backup ? raw[p.backup] : undefined;
    const fallbackActive =
      p.backup && backup?.fetchedAt && (r.fetchedAt === null || backup.fetchedAt > r.fetchedAt)
        ? (nameOf.get(p.backup) ?? null)
        : null;

    let state: ProviderStatus["state"] = "operational";
    let reason: string | null = null;
    if (!r.configured) {
      state = "standby";
      reason =
        p.role === "backup"
          ? "No API key configured; this backup is not available."
          : "No API key configured.";
    } else if (r.breakerOpen) {
      state = "down";
      reason =
        "Calls failed repeatedly; paused for 10 minutes while backups and cached data serve.";
    } else if (r.cooldown) {
      state = "degraded";
      reason = "The provider hit its rate limit; waiting for the time it asked for.";
    } else if (r.quotaUsed >= r.quotaCap * DEGRADED_QUOTA_SHARE) {
      state = "degraded";
      reason = `Used at least 80% of this ${r.quotaPeriod}'s cap; refreshes may pause until it resets.`;
    } else if (p.role === "backup" && r.fetchedAt === null) {
      state = "standby";
      reason = "Ready, but not needed: the primary provider is serving.";
    } else if (r.fetchedAt !== null && now - r.fetchedAt > staleAfterMs(p.ttl)) {
      state = "degraded";
      reason = "Data is older than expected; refreshes are not succeeding.";
    }

    return {
      id: p.id,
      name: p.name,
      role: p.role,
      serves: p.serves,
      state,
      reason,
      quotaUsed: r.quotaUsed,
      quotaCap: r.quotaCap,
      quotaPeriod: r.quotaPeriod,
      lastDataAt: r.fetchedAt === null ? null : new Date(r.fetchedAt).toISOString(),
      fallbackActive,
    };
  });
};
