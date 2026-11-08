"""Every localized kit is only ready if OpenCV recovers every expected ID from its rasterised PDF/SVG.

The Spanish kit lives at the root of assets/board-kit (the synthetic fixtures are rendered from it);
the en/it/fr kits live in their folders. Paths come from kit-index.json, the same whitelist the web
app serves from.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path

import cv2
import pytest

from tactiloom_vision import config
from tactiloom_vision.catalog import load_catalog
from tactiloom_vision.detector import analyze_image, detect_markers
from tactiloom_vision.synth import render_pdf_page

LOCALES = ("es", "en", "it", "fr")
EXPECTED_CARD_IDS = sorted(entry.marker_id for entry in load_catalog().values() if entry.enabled)


@lru_cache(maxsize=1)
def _kit_index() -> dict:
    return json.loads((config.KIT_DIR / "kit-index.json").read_text(encoding="utf-8"))


def kit_file(locale: str, name: str) -> Path:
    """File `name` of the kit in `locale`, resolved through kit-index.json."""
    for entry in _kit_index()["files"]:
        if entry["locale"] == locale and entry["name"] == name:
            return config.KIT_DIR / entry["path"]
    raise AssertionError(f"{name} is not listed for locale {locale} in kit-index.json")


def _ids(image) -> list[int]:
    markers, _slivers = detect_markers(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY))
    return sorted(m.marker_id for m in markers)


def test_index_lists_the_four_kits_with_spanish_at_the_root() -> None:
    index = _kit_index()
    assert [entry["locale"] for entry in index["locales"]] == list(LOCALES)
    assert index["defaultLocale"] == "es"
    # The fixtures read the root files: the Spanish kit must stay there.
    assert kit_file("es", "board-v1-a3.pdf") == config.KIT_DIR / "board-v1-a3.pdf"
    for locale in LOCALES[1:]:
        assert kit_file(locale, "board-v1-a3.pdf") == config.KIT_DIR / locale / "board-v1-a3.pdf"


@pytest.mark.parametrize("locale", LOCALES)
@pytest.mark.parametrize("px_per_mm", [2.5, 4.0])
def test_a3_board_pdf_calibrates(locale: str, px_per_mm: float) -> None:
    board = render_pdf_page(kit_file(locale, "board-v1-a3.pdf"), 0, px_per_mm)
    assert _ids(board) == [0, 1, 2, 3]
    result = analyze_image(board, request_id="req_kit", render=False)
    assert result["board"]["calibrated"] is True
    assert result["board"]["reprojectionErrorMm"] < 0.5
    assert result["cards"] == []


@pytest.mark.parametrize("locale", LOCALES)
def test_small_board_pdf_calibrates(locale: str) -> None:
    board = render_pdf_page(kit_file(locale, "board-v1-small-a4.pdf"), 0, 4.0)
    assert _ids(board) == [0, 1, 2, 3]
    assert analyze_image(board, request_id="req_small", render=False)["board"]["calibrated"] is True


@pytest.mark.parametrize("locale", LOCALES)
def test_tiles_contain_each_fiducial_once(locale: str) -> None:
    found: list[int] = []
    for page in range(4):
        found += _ids(render_pdf_page(kit_file(locale, "board-v1-a4-tiles.pdf"), page, 4.0))
    assert sorted(found) == [0, 1, 2, 3]


@pytest.mark.parametrize("locale", LOCALES)
@pytest.mark.parametrize(
    "pdf_name,layout_name",
    [("cards-v1-a4.pdf", "cards-v1-layout.json"), ("cards-v1-small-a4.pdf", "cards-v1-small-layout.json")],
)
def test_card_sheets_contain_every_catalog_marker_once(locale: str, pdf_name: str, layout_name: str) -> None:
    layout = json.loads(kit_file(locale, layout_name).read_text(encoding="utf-8"))
    found: list[int] = []
    for page in range(layout["pages"]):
        found += _ids(render_pdf_page(kit_file(locale, pdf_name), page, 6.0))
    assert sorted(found) == EXPECTED_CARD_IDS


@pytest.mark.skipif(
    shutil.which("rsvg-convert") is None and shutil.which("convert") is None, reason="no SVG rasteriser available"
)
@pytest.mark.parametrize("locale", LOCALES)
def test_board_svg_rasterises_to_detectable_fiducials(locale: str, tmp_path) -> None:
    svg = kit_file(locale, "board-v1-a3.svg")
    png = tmp_path / "board.png"
    if shutil.which("rsvg-convert"):
        cmd = ["rsvg-convert", "-d", "150", "-p", "150", "-o", str(png), str(svg)]
    else:
        cmd = ["convert", "-density", "150", str(svg), str(png)]
    subprocess.run(cmd, check=True, capture_output=True, timeout=120)  # fixed argv, no shell
    image = cv2.imread(str(png), cv2.IMREAD_COLOR)
    assert image is not None
    assert _ids(image) == [0, 1, 2, 3]
