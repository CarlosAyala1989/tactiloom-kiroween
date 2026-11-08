"""Contract tests: Python output vs. the published JSON Schemas generated from the Zod source."""

from __future__ import annotations

import json

import pytest
from jsonschema import Draft202012Validator

from ritualos_vision import config
from ritualos_vision.detector import analyze_image
from ritualos_vision.imaging import decode_image
from ritualos_vision.models import DetectionResult

from .conftest import EXPECTED_PATH, read_bytes

BOARDS = json.loads(EXPECTED_PATH.read_text(encoding="utf-8"))["boards"]


def _schema(name: str) -> dict:
    return json.loads((config.SCHEMAS_DIR / name).read_text(encoding="utf-8"))


@pytest.mark.parametrize("entry", BOARDS, ids=[b["id"] for b in BOARDS])
def test_detection_result_matches_json_schema(entry: dict, detection_schema: dict) -> None:
    result = analyze_image(decode_image(read_bytes(entry["file"])), request_id="req_contract")
    errors = sorted(Draft202012Validator(detection_schema).iter_errors(result), key=lambda e: list(e.path))
    assert errors == [], [f"{list(e.path)}: {e.message}" for e in errors]
    DetectionResult.model_validate(result)


def test_board_state_projection_matches_board_state_schema() -> None:
    entry = next(b for b in BOARDS if b["id"] == "valid-board")
    result = analyze_image(decode_image(read_bytes(entry["file"])), request_id="req_state", render=False)
    board_state = {
        "protocolVersion": result["protocolVersion"],
        "sourceMode": result["sourceMode"],
        "board": {k: result["board"][k] for k in ("templateId", "columns", "rows", "calibrated")},
        "cards": [
            {k: card[k] for k in ("markerId", "row", "col", "orientation", "quality", "cardInstanceId", "type")}
            for card in result["cards"]
        ],
        "diagnostics": result["diagnostics"],
    }
    errors = list(Draft202012Validator(_schema("board-state.v1.schema.json")).iter_errors(board_state))
    assert errors == []


def test_catalog_files_match_their_schemas() -> None:
    for data_file, schema_file in (
        ("board-v1.json", "board-template.v1.schema.json"),
        ("cards-v1.json", "card-catalog.v1.schema.json"),
    ):
        data = json.loads((config.CATALOG_DIR / data_file).read_text(encoding="utf-8"))
        errors = list(Draft202012Validator(_schema(schema_file)).iter_errors(data))
        assert errors == [], data_file


def test_pydantic_and_schema_agree_on_required_fields(detection_schema: dict) -> None:
    schema_required = set(detection_schema["required"])
    model_required = {name for name, field in DetectionResult.model_fields.items() if field.is_required()}
    assert schema_required == model_required
