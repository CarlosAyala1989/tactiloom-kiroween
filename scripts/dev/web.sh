#!/usr/bin/env bash
# Starts the built Next.js app (`pnpm build` first) on ${WEB_PORT:-3210}. Use `dev` as first argument for next dev.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then set -a; . "$ROOT/.env"; set +a; fi
cd "$ROOT/apps/web"
if [[ "${1:-start}" == "dev" ]]; then
  exec npx next dev --hostname "${WEB_HOST:-127.0.0.1}" --port "${WEB_PORT:-3210}"
fi
exec npx next start --hostname "${WEB_HOST:-127.0.0.1}" --port "${WEB_PORT:-3210}"
