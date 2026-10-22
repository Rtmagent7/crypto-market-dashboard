/**
 * Go-live checklist (spec §17): "Alert webhook tested (triggered manually once)".
 * Sends one alert through the production sink (src/infra/alerts.ts), so the payload format
 * (Discord `content` / Telegram `text`) is the one real alerts use.
 *
 * Run: npm run alert:test   (reads ALERT_WEBHOOK_URL from .env.local)
 */
import { createAlertSink } from "../src/infra/alerts";
import { createMemoryStore } from "../src/infra/store";

const url = process.env.ALERT_WEBHOOK_URL;
if (!url) {
  console.error("ALERT_WEBHOOK_URL is not set (.env.local).");
  process.exit(1);
}

const sent = await createAlertSink({ url, store: createMemoryStore() }).send({
  key: `manual-test:${Date.now()}`,
  title: "Test alert from crypto-market-dashboard",
  detail: `Sent by npm run alert:test at ${new Date().toISOString()}. No action needed.`,
});
console.log(sent ? "Alert sent." : "The webhook did not accept the alert.");
process.exit(sent ? 0 : 1);
