# Load test

Spec §12: _50 VUs × 5 min → provider (mock) call count does not scale with users._

Run it with `npm run test:load` after `npm run build` (needs [k6](https://k6.io)). The script
starts the standalone production server in mock mode, warms it with one visit, reads the provider
counters from `/api/status` (the guard's own counters), runs k6, and reads them again. It fails if
the count grew.

## Result — 2026-10-22

Each of 50 virtual users loads the Overview and `/api/market` once a second, from its own client
address (per-IP rate limit is 120/min), for 5 minutes. Server and k6 shared a 2-vCPU VM.

| Metric                                  |                                 Value |
| :-------------------------------------- | ------------------------------------: |
| Requests                                |                                24,830 |
| Failed requests                         |                             0 (0.00%) |
| `/api/market` latency                   | avg 30.6 ms · p95 101 ms · max 248 ms |
| Overview + API latency                  |               avg 104 ms · p95 401 ms |
| **Provider credits used — before load** |                                 **6** |
| **Provider credits used — after load**  |                                 **6** |

**Pass: provider calls did not grow with load.** 24,830 requests were served entirely from the
shared cache; the TTL, not traffic, decides when a provider is called.
