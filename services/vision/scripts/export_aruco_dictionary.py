"""Export the OpenCV ArUco DICT_4X4_100 bit patterns for the TypeScript board-kit.

The board-kit renders markers as vector modules (SVG/PDF). To guarantee that the printed
markers are *real* ArUco codes, the patterns are taken from OpenCV itself and a pytest
(`tests/test_dictionary_export.py`) verifies that the committed JSON still matches OpenCV.

Usage: services/vision/.venv/bin/python services/vision/scripts/export_aruco_dictionary.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services" / "vision"))

from ritualos_vision.aruco import export_dictionary  # noqa: E402

OUTPUT = ROOT / "packages" / "board-kit" / "src" / "aruco" / "dict-4x4-100.json"


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(export_dictionary(), indent=1) + "\n", encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
