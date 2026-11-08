#!/usr/bin/env bash
# Starts the long-running runner (job queue worker) with the root .env.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then set -a; . "$ROOT/.env"; set +a; fi
cd "$ROOT"
exec pnpm --filter @ritualos/runner start
