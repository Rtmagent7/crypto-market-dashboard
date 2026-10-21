import type { DataEnvelope, ProviderStatus } from "@/modules/shared/domain";

import { computeStatuses } from "./status.logic";
import { getStatusRepository, type StatusRepository } from "./status.repository";

/** /status polls every 60 s (spec §8). */
export const STATUS_POLL_SECONDS = 60;

export interface StatusService {
  getStatus(): Promise<DataEnvelope<ProviderStatus[]>>;
}

export const createStatusService = ({
  repository,
  now = Date.now,
}: {
  repository: StatusRepository;
  now?: () => number;
}): StatusService => ({
  getStatus: async () => {
    const t = now();
    const next = new Date(t + STATUS_POLL_SECONDS * 1000).toISOString();
    try {
      const raw = await repository.snapshot(t);
      return {
        data: computeStatuses(raw, { now: t }),
        status: "fresh",
        source: "internal",
        fetchedAt: new Date(t).toISOString(),
        nextRefreshAt: next,
      };
    } catch {
      // Redis itself is unreachable: say so instead of inventing numbers.
      return {
        data: null,
        status: "unavailable",
        source: "internal",
        fetchedAt: new Date(t).toISOString(),
        nextRefreshAt: next,
      };
    }
  },
});

let service: StatusService | undefined;

export const getStatusService = (): StatusService =>
  (service ??= createStatusService({ repository: getStatusRepository() }));
