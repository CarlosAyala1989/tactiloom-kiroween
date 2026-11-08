"""Localization: structured diagnostic params (clients translate) and overlay texts per locale."""

from __future__ import annotations

import json
import os

import pytest
from fastapi.testclient import TestClient

from tactiloom_vision import app as app_module
from tactiloom_vision.catalog import FIDUCIAL_IDS, load_template
from tactiloom_vision.detector import RawMarker, analyze_image, calibrate
from tactiloom_vision.i18n import LOCALES, OVERLAY_STRINGS, overlay_header
from tactiloom_vision.imaging import decode_image
from tactiloom_vision.models import Diagnostic
from tactiloom_vision.overlay import ascii_text

from .conftest import EXPECTED_PATH, REPO_ROOT, read_bytes

BOARDS = json.loads(EXPECTED_PATH.read_text(encoding="utf-8"))["boards"]
client = TestClient(app_module.app)
# Real detector diagnostics consumed by the web i18n tests (apps/web/test/diagnostics-i18n.test.ts).
SAMPLES_PATH = REPO_ROOT / "tests" / "fixtures" / "vision-diagnostic-samples.json"


def _board(board_id: str) -> dict:
    entry = next(b for b in BOARDS if b["id"] == board_id)
    return analyze_image(decode_image(read_bytes(entry["file"])), request_id="req_i18n", render=False)


@pytest.mark.parametrize("entry", BOARDS, ids=[b["id"] for b in BOARDS])
def test_every_diagnostic_carries_valid_params(entry: dict) -> None:
    result = analyze_image(decode_image(read_bytes(entry["file"])), request_id="req_params", render=False)
    for diagnostic in result["diagnostics"]:
        assert isinstance(diagnostic.get("params"), dict), diagnostic["code"]
        Diagnostic.model_validate(diagnostic)
        params = diagnostic["params"]
        if "markerId" in params and diagnostic["code"] not in ("UNKNOWN_CARD", "MARKER_SIZE_MISMATCH"):
            assert isinstance(params.get("kind"), str), diagnostic["code"]


def test_params_identify_what_the_message_says() -> None:
    corner = next(
        d for d in _board("invalid-board-missing-corner")["diagnostics"] if d["code"] == "BOARD_FIDUCIAL_MISSING"
    )
    assert corner["params"] == {"fiducials": [2]}
    ambiguous = next(d for d in _board("invalid-board-ambiguous")["diagnostics"] if d["code"] == "AMBIGUOUS_POSITION")
    assert ambiguous["params"] == {"markerId": 15, "kind": "CREATE_REPORT"}
    assert ambiguous["cells"] == [{"row": 0, "col": 5}, {"row": 1, "col": 5}]


def _fiducials(scale: float, mirror: bool = False) -> dict[int, RawMarker]:
    template = load_template()
    markers = {}
    for fid in FIDUCIAL_IDS:
        corners = template.fiducial(fid).corners_mm() * scale + 40.0
        if mirror:
            corners[:, 0] = 4000.0 - corners[:, 0]
        markers[fid] = RawMarker(fid, corners)
    return markers


def test_calibration_problems_have_a_machine_readable_reason() -> None:
    template = load_template()
    matrix, rms, problem = calibrate(_fiducials(3.0), template, 1600.0 * 1200.0)
    assert matrix is not None and problem is None and rms is not None and rms < 0.01
    assert calibrate(_fiducials(3.0, mirror=True), template, 1600.0 * 1200.0)[2][0] == "mirrored"
    assert calibrate(_fiducials(0.2), template, 1600.0 * 1200.0)[2][0] == "small"


def test_locale_changes_only_the_overlay() -> None:
    entry = next(b for b in BOARDS if b["id"] == "invalid-board-ambiguous")
    image = decode_image(read_bytes(entry["file"]))
    results = {locale: analyze_image(image, request_id="req_same", locale=locale) for locale in LOCALES}
    for locale in LOCALES:
        for key in ("board", "cards", "rejectedMarkers", "diagnostics"):
            assert results[locale][key] == results["es"][key], (locale, key)
    overlays = {results[locale]["overlay"]["dataBase64"] for locale in LOCALES}
    assert len(overlays) == len(LOCALES)  # the header/labels differ per language


def test_overlay_strings_are_complete_and_drawable() -> None:
    assert set(OVERLAY_STRINGS) == set(LOCALES)
    for locale, strings in OVERLAY_STRINGS.items():
        for name, value in vars(strings).items():
            assert value.strip(), (locale, name)
            assert "?" not in ascii_text(value), (locale, name, value)
    assert overlay_header("en", 1, True, 0, []) == "Tactiloom vision | 1 card | calibrated | errors: 0"
    assert overlay_header("fr", 3, False, 2, [2]) == (
        "Tactiloom vision | 3 cartes | NON CALIBRÉ | erreurs: 2 | coins manquants: 2"
    )
    assert overlay_header("it", 10, True, 0, []) == "Tactiloom vision | 10 carte | calibrato | errori: 0"


def test_ascii_text_transliterates_accents_and_ligatures() -> None:
    assert ascii_text("calibré, écarté, Nœud, ñandú, perché, ça") == "calibre, ecarte, Noeud, nandu, perche, ca"
    assert ascii_text("→") == "?"


def test_api_accepts_supported_locales_and_rejects_others() -> None:
    data = read_bytes("assets/examples/boards/valid-board.png")
    for locale in LOCALES:
        response = client.post("/v1/analyze", files={"image": ("b.png", data, "image/png")}, data={"locale": locale})
        assert response.status_code == 200, locale
        assert len(response.json()["cards"]) == 10
    bad = client.post("/v1/analyze", files={"image": ("b.png", data, "image/png")}, data={"locale": "de"})
    assert bad.status_code == 400
    assert bad.json()["error"]["code"] == "BAD_REQUEST"
    assert set(bad.json()["error"]) == {"code", "message", "requestId"}


def test_api_default_locale_is_spanish() -> None:
    data = read_bytes("assets/examples/boards/valid-board.png")
    default = client.post("/v1/analyze", files={"image": ("b.png", data, "image/png")}, headers={"x-request-id": "r1"})
    spanish = client.post(
        "/v1/analyze",
        files={"image": ("b.png", data, "image/png")},
        data={"locale": "es"},
        headers={"x-request-id": "r1"},
    )
    assert default.status_code == spanish.status_code == 200
    assert default.json()["overlay"]["dataBase64"] == spanish.json()["overlay"]["dataBase64"]


def _samples() -> list[dict]:
    samples = []
    for entry in BOARDS:
        result = analyze_image(decode_image(read_bytes(entry["file"])), request_id="req_samples", render=False)
        samples.extend({"board": entry["id"], **diagnostic} for diagnostic in result["diagnostics"])
    return samples


def _shape(sample: dict) -> tuple:
    params = sample.get("params") or {}
    return (
        sample["board"],
        sample["code"],
        sample["severity"],
        tuple(sorted(params)),
        params.get("variant"),
        tuple(sample.get("markerIds") or []),
    )


def test_web_diagnostic_samples_are_current() -> None:
    """The web renders vision diagnostics from code + params: its fixture must match the detector.

    Regenerate with ``UPDATE_VISION_SAMPLES=1 pnpm vision:test``.
    """
    current = _samples()
    if os.environ.get("UPDATE_VISION_SAMPLES") == "1":
        note = "Generated by services/vision/tests/test_i18n.py from the committed fixtures (pixels only)."
        payload = {"note": note, "diagnostics": current}
        SAMPLES_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    stored = json.loads(SAMPLES_PATH.read_text(encoding="utf-8"))["diagnostics"]
    assert [_shape(sample) for sample in stored] == [_shape(sample) for sample in current]
