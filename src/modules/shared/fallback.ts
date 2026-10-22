import type { DataEnvelope, ProviderId } from "./domain";
import { toEnvelope, type GateResult } from "./envelope";

export interface Source<Raw, T> {
  provider: ProviderId;
  load: () => Promise<GateResult<Raw>>;
  map: (raw: Raw) => T;
}

/**
 * Degradation order (spec §5, §10.2): fresh primary → fresh backup → stale primary →
 * stale backup → unavailable. The backup is only called when the primary is not fresh,
 * and the envelope's `source` always names whoever actually served the data.
 *
 * Exception: stale because another request is refreshing the primary right now (single-flight
 * lock) is not a failure, so the backup is not called and does not spend quota.
 */
export const withFallback = async <P, B, T>(
  primary: Source<P, T>,
  backup: Source<B, T>,
  now: number,
): Promise<DataEnvelope<T>> => {
  const first = await primary.load();
  const viaPrimary = (): DataEnvelope<T> =>
    toEnvelope(first, { source: primary.provider, map: primary.map, now });
  if (first.status === "fresh") return viaPrimary();
  if (first.status === "stale" && first.reason === "locked") return viaPrimary();

  const second = await backup.load();
  const viaBackup = (): DataEnvelope<T> =>
    toEnvelope(second, { source: backup.provider, map: backup.map, now });
  if (second.status === "fresh") return viaBackup();
  if (first.status === "stale") return viaPrimary();
  if (second.status === "stale") return viaBackup();
  return viaPrimary();
};
