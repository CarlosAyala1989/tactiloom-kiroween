"""The printable kit is only ready if OpenCV recovers every expected ID from the rasterised PDF/SVG."""

from __future__ import annotations

import json
import shutil
import subprocess

import cv2
import pytest

from tactiloom_vision.catalog import load_catalog
from tactiloom_vision.detector import analyze_image, detect_markers
from tactiloom_vision.synth import render_pdf_page

from .conftest import kit_path

EXPECTED_CARD_IDS = sorted(entry.marker_id for entry in load_catalog().values() if entry.enabled)


def _ids(image) -> list[int]:
    markers, _slivers = detect_markers(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY))
    return sorted(m.marker_id for m in markers)


@pytest.mark.parametrize("px_per_mm", [2.5, 4.0])
def test_a3_board_pdf_calibrates(px_per_mm: float) -> None:
    board = render_pdf_page(kit_path("board-v1-a3.pdf"), 0, px_per_mm)
    assert _ids(board) == [0, 1, 2, 3]
    result = analyze_image(board, request_id="req_kit", render=False)
    assert result["board"]["calibrated"] is True
    assert result["board"]["reprojectionErrorMm"] < 0.5
    assert result["cards"] == []


def test_small_board_pdf_calibrates() -> None:
    board = render_pdf_page(kit_path("board-v1-small-a4.pdf"), 0, 4.0)
    assert _ids(board) == [0, 1, 2, 3]
    assert analyze_image(board, request_id="req_small", render=False)["board"]["calibrated"] is True


def test_tiles_contain_each_fiducial_once() -> None:
    found: list[int] = []
    for page in range(4):
        found += _ids(render_pdf_page(kit_path("board-v1-a4-tiles.pdf"), page, 4.0))
    assert sorted(found) == [0, 1, 2, 3]


@pytest.mark.parametrize(
    "pdf_name,layout_name",
    [("cards-v1-a4.pdf", "cards-v1-layout.json"), ("cards-v1-small-a4.pdf", "cards-v1-small-layout.json")],
)
def test_card_sheets_contain_every_catalog_marker_once(pdf_name: str, layout_name: str) -> None:
    layout = json.loads(kit_path(layout_name).read_text(encoding="utf-8"))
    found: list[int] = []
    for page in range(layout["pages"]):
        found += _ids(render_pdf_page(kit_path(pdf_name), page, 6.0))
    assert sorted(found) == EXPECTED_CARD_IDS


@pytest.mark.skipif(
    shutil.which("rsvg-convert") is None and shutil.which("convert") is None, reason="no SVG rasteriser available"
)
def test_board_svg_rasterises_to_detectable_fiducials(tmp_path) -> None:
    svg = kit_path("board-v1-a3.svg")
    png = tmp_path / "board.png"
    if shutil.which("rsvg-convert"):
        cmd = ["rsvg-convert", "-d", "150", "-p", "150", "-o", str(png), str(svg)]
    else:
        cmd = ["convert", "-density", "150", str(svg), str(png)]
    subprocess.run(cmd, check=True, capture_output=True, timeout=120)  # fixed argv, no shell
    image = cv2.imread(str(png), cv2.IMREAD_COLOR)
    assert image is not None
    assert _ids(image) == [0, 1, 2, 3]
