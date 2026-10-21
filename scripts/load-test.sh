#!/usr/bin/env bash
# Runs the k6 load test against a local production build in mock mode and proves that provider
# call counts (read from /api/status — the guard's own counters) do not scale with load.
set -euo pipefail
PORT=${PORT:-3300}
BASE="http://127.0.0.1:${PORT}"
calls() {
  curl -s "${BASE}/api/status" -H "x-forwarded-for: 192.0.2.1" |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const e=JSON.parse(s);console.log(e.data.reduce((n,p)=>n+p.quotaUsed,0))})'
}
MOCK_PROVIDERS=1 PORT=$PORT HOSTNAME=127.0.0.1 node .next/standalone/server.js >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
until curl -s -o /dev/null "${BASE}/"; do sleep 1; done
curl -s -o /dev/null "${BASE}/"   # warm: the first visit fills the cache
BEFORE=$(calls)
k6 run --quiet --summary-trend-stats "avg,p(95),max" -e BASE_URL="$BASE" tests/load/overview.k6.js
AFTER=$(calls)
echo "provider credits used: before load ${BEFORE}, after load ${AFTER}"
if [ "$AFTER" -gt "$BEFORE" ]; then
  echo "FAIL: provider calls grew under load"; exit 1
fi
echo "PASS: provider calls did not grow with load"
