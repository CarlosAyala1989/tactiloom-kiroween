#!/usr/bin/env bash
# Starts the vision service (FastAPI + OpenCV) on 127.0.0.1:${VISION_PORT:-8210} with the root .env.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then set -a; . "$ROOT/.env"; set +a; fi
cd "$ROOT/services/vision"
exec .venv/bin/uvicorn tactiloom_vision.app:app --host 127.0.0.1 --port "${VISION_PORT:-8210}"
