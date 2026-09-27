#!/usr/bin/env bash
# Phase 2 benchmark driver: runs each scenario on a fresh page load in headless
# Chrome (agent-browser) and prints one JSON line per scenario.
# Usage: scripts/bench.sh [baseURL] [scenario...]
#   BENCH_VIEWPORT="915 412 2" scripts/bench.sh   # phone-like viewport / DPR
#   BENCH_QUERY="&profile=low"                     # extra URL params
set -u
BASE="${1:-http://localhost:5173/}"; shift || true
SCENARIOS=("$@")
[ ${#SCENARIOS[@]} -eq 0 ] && SCENARIOS=(baseline_world gameplay resource_heavy building_heavy weather_night combat)
VIEWPORT="${BENCH_VIEWPORT:-1280 720 1}"
agent-browser set viewport $VIEWPORT >/dev/null 2>&1
for sc in "${SCENARIOS[@]}"; do
  timeout 30 agent-browser open "about:blank" >/dev/null 2>&1
  # 'open' waits for the load event, which third-party scripts can stall; navigate via JS instead.
  timeout 20 agent-browser eval "location.href='${BASE}?seed=42&bench=${sc}${BENCH_QUERY:-}'; 1" >/dev/null 2>&1
  for i in $(seq 1 60); do
    out=$(timeout 20 agent-browser eval "window.__perf && window.__perf.done ? JSON.stringify(Object.assign({}, window.__perf.done, window.__perf.loadTimes())) : ''" 2>/dev/null)
    if [ -n "$out" ] && [ "$out" != '""' ]; then echo "$out"; break; fi
    sleep 2
  done
done
