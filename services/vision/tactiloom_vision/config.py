"""Runtime configuration (environment variables with safe defaults)."""

from __future__ import annotations

import os
from pathlib import Path

_PARENTS = Path(__file__).resolve().parents
# Repository layout: services/vision/tactiloom_vision/config.py → repo root is 3 levels up.
# In the container the package lives at /app/tactiloom_vision and paths come from env vars.
REPO_ROOT = _PARENTS[3] if len(_PARENTS) > 3 else _PARENTS[-1]


def _path(name: str, default: Path) -> Path:
    value = os.environ.get(name)
    return Path(value) if value else default


def _int(name: str, default: int) -> int:
    value = os.environ.get(name)
    return int(value) if value else default


CATALOG_DIR = _path("TACTILOOM_CATALOG_DIR", REPO_ROOT / "packages" / "contracts" / "catalog")
SCHEMAS_DIR = _path("TACTILOOM_SCHEMAS_DIR", REPO_ROOT / "packages" / "contracts" / "schemas")
KIT_DIR = _path("TACTILOOM_KIT_DIR", REPO_ROOT / "assets" / "board-kit")

MAX_UPLOAD_BYTES = _int("VISION_MAX_UPLOAD_BYTES", 12 * 1024 * 1024)
MAX_PIXELS = _int("VISION_MAX_PIXELS", 40_000_000)
MAX_SIDE_PX = _int("VISION_MAX_SIDE_PX", 10_000)
MIN_SIDE_PX = _int("VISION_MIN_SIDE_PX", 320)
MAX_MARKERS = _int("VISION_MAX_MARKERS", 120)
DETECTION_MAX_SIDE_PX = _int("VISION_DETECTION_MAX_SIDE_PX", 2600)
OVERLAY_MAX_WIDTH = _int("VISION_OVERLAY_MAX_WIDTH", 1600)
MAX_CONCURRENT_ANALYSES = _int("VISION_MAX_CONCURRENT", 2)
QUEUE_TIMEOUT_S = _int("VISION_QUEUE_TIMEOUT_S", 15)
INTERNAL_TOKEN = os.environ.get("VISION_INTERNAL_TOKEN") or None
