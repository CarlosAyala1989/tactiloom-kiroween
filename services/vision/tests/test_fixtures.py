"""Detector vs. ground truth on the committed synthetic fixtures (pixels only)."""

from __future__ import annotations

import base64
import json

import cv2
import numpy as np
import pytest

from ritualos_vision.detector import analyze_image
from ritualos_vision.imaging import decode_image

from .conftest import EXPECTED_PATH, card_tuples, read_bytes

BOARDS = json.loads(EXPECTED_PATH.read_text(encoding="utf-8"))["boards"]


@pytest.mark.parametrize("entry", BOARDS, ids=[b["id"] for b in BOARDS])
def test_fixture_matches_ground_truth(entry: dict) -> None:
    image = decode_image(read_bytes(entry["file"]))
    result = analyze_image(image, request_id="req_test")
    expected = entry["vision"]
    assert result["board"]["calibrated"] is expected["calibrated"]
    assert card_tuples(result["cards"]) == [
        (c["markerId"], c["row"], c["col"], c["orientation"]) for c in expected["cards"]
    ]
    error_codes = sorted({d["code"] for d in result["diagnostics"] if d["severity"] == "error"})
    assert error_codes == expected["errorCodes"]


def test_valid_board_details() -> None:
    entry = next(b for b in BOARDS if b["id"] == "valid-board")
    result = analyze_image(decode_image(read_bytes(entry["file"])), request_id="req_valid")
    assert result["board"]["fiducialsFound"] == [0, 1, 2, 3]
    assert result["board"]["reprojectionErrorMm"] < 1.0
    types = {c["markerId"]: c["type"] for c in result["cards"]}
    assert types[14] == "CONDITION" and types[18] == "REQUEST_REVIEW" and types[19] == "END"
    for card in result["cards"]:
        assert 0.8 <= card["quality"] <= 1.0
        assert abs(card["sideMm"] - 22.0) < 2.0
    # Overlay is a decodable JPEG rendered from the same detections.
    overlay = result["overlay"]
    assert overlay["mime"] == "image/jpeg"
    raw = np.frombuffer(base64.b64decode(overlay["dataBase64"]), dtype=np.uint8)
    decoded = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    assert decoded.shape[1] == overlay["width"] and decoded.shape[0] == overlay["height"]


def test_missing_corner_explains_which() -> None:
    entry = next(b for b in BOARDS if b["id"] == "invalid-board-missing-corner")
    result = analyze_image(decode_image(read_bytes(entry["file"])), request_id="req_corner")
    assert result["board"]["fiducialsMissing"] == [2]
    diagnostic = next(d for d in result["diagnostics"] if d["code"] == "BOARD_FIDUCIAL_MISSING")
    assert diagnostic["markerIds"] == [2]
    assert "inferior derecha" in diagnostic["message"]
    assert result["cards"] == []
    assert all(r["reason"] == "BOARD_FIDUCIAL_MISSING" for r in result["rejectedMarkers"] if r["markerId"] >= 10)


def test_ambiguous_position_reports_both_cells() -> None:
    entry = next(b for b in BOARDS if b["id"] == "invalid-board-ambiguous")
    result = analyze_image(decode_image(read_bytes(entry["file"])), request_id="req_amb")
    diagnostic = next(d for d in result["diagnostics"] if d["code"] == "AMBIGUOUS_POSITION")
    assert diagnostic["markerIds"] == [15]
    assert diagnostic["cells"] == [{"row": 0, "col": 5}, {"row": 1, "col": 5}]


def test_deterministic_output_for_same_pixels() -> None:
    entry = next(b for b in BOARDS if b["id"] == "valid-board-perspective")
    image = decode_image(read_bytes(entry["file"]))
    first = analyze_image(image, request_id="req_same", render=False)
    second = analyze_image(image.copy(), request_id="req_same", render=False)
    for key in ("board", "cards", "rejectedMarkers", "diagnostics"):
        assert first[key] == second[key]
