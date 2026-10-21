// k6 load test (spec §12): 50 virtual users × 5 minutes against the Overview and /api/market.
// Pass criterion lives in scripts/load-test.sh: provider calls must NOT grow with load.
import { check, sleep } from "k6";
import http from "k6/http";

const BASE = __ENV.BASE_URL || "http://127.0.0.1:3300";

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || "5m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{endpoint:api}": ["p(95)<1000"],
  },
};

export default function visitOverview() {
  // A distinct client address per virtual user, like real visitors (the per-IP limit is 120/min).
  const headers = { "x-forwarded-for": `198.51.100.${__VU}` };
  const page = http.get(`${BASE}/`, { headers, tags: { endpoint: "page" } });
  check(page, { "overview 200": (r) => r.status === 200 });
  const api = http.get(`${BASE}/api/market`, { headers, tags: { endpoint: "api" } });
  check(api, {
    "api 200": (r) => r.status === 200,
    "api fresh or stale": (r) => /"status":"(fresh|stale)"/.test(r.body),
  });
  sleep(1);
}
