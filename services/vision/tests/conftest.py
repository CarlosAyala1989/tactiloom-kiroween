from __future__ import annotations

import json
from pathlib import Path

import pytest

from ritualos_vision import config

REPO_ROOT = config.REPO_ROOT
EXPECTED_PATH = REPO_ROOT / "tests" / "fixtures" / "expected-results.json"


@pytest.fixture(scope="session")
def expected_results() -> dict:
    return json.loads(EXPECTED_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def detection_schema() -> dict:
    return json.loads((config.SCHEMAS_DIR / "detection-result.v1.schema.json").read_text(encoding="utf-8"))


def read_bytes(relative: str) -> bytes:
    return (REPO_ROOT / relative).read_bytes()


def card_tuples(cards: list[dict]) -> list[tuple[int, int, int, str]]:
    return [(c["markerId"], c["row"], c["col"], c["orientation"]) for c in cards]


def kit_path(name: str) -> Path:
    return config.KIT_DIR / name
