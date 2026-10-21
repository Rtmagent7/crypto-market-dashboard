import type { Logger } from "./logger";
import type { KeyValueStore } from "./store";

/** Spec §10.5: quota 70/90%, circuit breaker open, Zod contract failure, cron failing twice. */
export interface Alert {
  /** Dedupe key: the same key alerts at most once per DEDUPE window. */
  key: string;
  title: string;
  detail: string;
}

export interface AlertSink {
  /** Resolves true if sent, false if deduped or the webhook failed. Never throws. */
  send(alert: Alert): Promise<boolean>;
}

const DEDUPE_MS = 3_600_000;
const SEND_TIMEOUT_MS = 2_000;

const payloadFor = (url: string, text: string): Record<string, unknown> =>
  url.includes("api.telegram.org") ? { text, disable_web_page_preview: true } : { content: text };

/** Discord or Telegram webhook, deduplicated through the shared store across instances. */
export const createAlertSink = ({
  url,
  store,
}: {
  url: string;
  store: KeyValueStore;
}): AlertSink => ({
  send: async (alert) => {
    try {
      const first = await store.set(`alert:${alert.key}`, true, { px: DEDUPE_MS, nx: true });
      if (!first) return false;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payloadFor(url, `⚠️ ${alert.title}\n${alert.detail}`)),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      return res.ok;
    } catch {
      return false; // alerting must never break the request that triggered it
    }
  },
});

const str = (v: unknown): string =>
  typeof v === "string" || typeof v === "number" ? String(v) : "";

/** Wraps a logger: alert-worthy events also go to the sink; everything is still logged. */
export const createAlertingLogger = (
  base: Logger,
  sink: AlertSink,
  /** Keeps the send alive after the response (serverless): Next's after(). */
  defer: (task: Promise<unknown>) => void = (task) => void task,
): Logger => ({
  log(level, event, fields) {
    base.log(level, event, fields);
    const provider = str(fields.provider);
    let alert: Alert | null = null;
    if (event === "circuit_open") {
      alert = {
        key: `circuit_open:${provider}`,
        title: `Circuit breaker opened for ${provider}`,
        detail: `Calls failed repeatedly; paused for ${str(fields.openForSeconds)} s. Backups and cached data are serving.`,
      };
    } else if (event === "contract_error") {
      alert = {
        key: `contract_error:${provider}:${str(fields.endpoint)}`,
        title: `${provider} changed its response format`,
        detail: `${str(fields.endpoint)} failed schema validation. Capture a new fixture and update the schema (runbook).`,
      };
    } else if (event === "quota_threshold") {
      alert = {
        key: `quota_threshold:${provider}:${str(fields.threshold)}:${str(fields.period)}`,
        title: `${provider} used ${str(fields.threshold)}% of its quota`,
        detail: `${str(fields.used)} of ${str(fields.cap)} calls in ${str(fields.period)}. Consider raising the TTL in cache-policy.ts.`,
      };
    }
    if (alert) defer(sink.send(alert));
  },
});
