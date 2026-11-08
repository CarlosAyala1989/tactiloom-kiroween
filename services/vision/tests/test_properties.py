"""Property-based tests (Hypothesis): random legal placements photographed under random cameras
must be read back exactly from the pixels."""

from __future__ import annotations

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from ritualos_vision.catalog import load_catalog, load_template
from ritualos_vision.detector import analyze_image
from ritualos_vision.synth import (
    Camera,
    PlacedCard,
    Scene,
    compose_board,
    perspective_corners,
    photograph,
    rotate_corners,
)

TEMPLATE = load_template()
CARD_IDS = sorted(entry.marker_id for entry in load_catalog().values() if entry.enabled)
CELLS = [(r, c) for r in range(TEMPLATE.rows) for c in range(TEMPLATE.columns)]


@st.composite
def placements(draw: st.DrawFn) -> list[PlacedCard]:
    count = draw(st.integers(min_value=1, max_value=10))
    ids = draw(st.lists(st.sampled_from(CARD_IDS), min_size=count, max_size=count, unique=True))
    cells = draw(st.lists(st.sampled_from(CELLS), min_size=count, max_size=count, unique=True))
    cards = []
    for marker_id, (row, col) in zip(ids, cells, strict=True):
        orientation = draw(st.sampled_from(["N", "E", "S", "W"]))
        dx = draw(st.floats(min_value=-2.5, max_value=2.5))
        dy = draw(st.floats(min_value=-2.5, max_value=2.5))
        jitter = draw(st.floats(min_value=-6.0, max_value=6.0))
        cards.append(PlacedCard(marker_id, row, col, orientation, offset_mm=(dx, dy), jitter_deg=jitter))
    return cards


@st.composite
def cameras(draw: st.DrawFn) -> Camera:
    strength = draw(st.floats(min_value=0.0, max_value=1.0))
    roll = draw(st.floats(min_value=-6.0, max_value=6.0))
    seed = draw(st.integers(min_value=0, max_value=10_000))
    return Camera(
        corners=rotate_corners(perspective_corners(strength, np.random.default_rng(seed)), roll),
        rotate90=draw(st.integers(min_value=0, max_value=3)),
        blur_sigma=draw(st.floats(min_value=0.0, max_value=1.2)),
        noise_sigma=draw(st.floats(min_value=0.0, max_value=4.0)),
        brightness=draw(st.floats(min_value=0.6, max_value=1.15)),
        gradient=draw(st.floats(min_value=0.0, max_value=0.2)),
        jpeg_quality=draw(st.sampled_from([None, 80, 92])),
        seed=seed,
    )


@settings(max_examples=25, deadline=None, suppress_health_check=[HealthCheck.too_slow], derandomize=True)
@given(cards=placements(), camera=cameras())
def test_random_scenes_are_read_back_exactly(cards: list[PlacedCard], camera: Camera) -> None:
    photo = photograph(compose_board(Scene(tuple(cards))), camera)
    result = analyze_image(photo, request_id="req_prop", render=False)
    assert result["board"]["calibrated"], result["diagnostics"]
    detected = [(c["markerId"], c["row"], c["col"], c["orientation"]) for c in result["cards"]]
    expected = sorted(((c.marker_id, c.row, c.col, c.orientation) for c in cards), key=lambda t: (t[1], t[2], t[0]))
    assert detected == expected
    assert not [d for d in result["diagnostics"] if d["severity"] == "error"]


@settings(max_examples=10, deadline=None, derandomize=True)
@given(
    fraction=st.floats(min_value=0.36, max_value=0.46),
    axis=st.sampled_from(["x", "y"]),
    sign=st.sampled_from([-1.0, 1.0]),
)
def test_cards_between_cells_are_never_silently_assigned(fraction: float, axis: str, sign: float) -> None:
    # Card #14 in the middle of the board, pushed towards a neighbouring cell beyond the tolerance (0.32).
    offset = (
        (sign * fraction * TEMPLATE.cell_width, 0.0) if axis == "x" else (0.0, sign * fraction * TEMPLATE.cell_height)
    )
    photo = photograph(compose_board(Scene((PlacedCard(14, 1, 3, "E", offset_mm=offset),))), Camera(seed=3))
    result = analyze_image(photo, request_id="req_amb", render=False)
    assert result["cards"] == []
    codes = {d["code"] for d in result["diagnostics"] if d["severity"] == "error"}
    assert codes == {"AMBIGUOUS_POSITION"}


@settings(max_examples=8, deadline=None, derandomize=True)
@given(angle=st.floats(min_value=22.0, max_value=68.0), sign=st.sampled_from([-1.0, 1.0]))
def test_diagonal_cards_are_flagged(angle: float, sign: float) -> None:
    photo = photograph(compose_board(Scene((PlacedCard(16, 2, 5, "E", jitter_deg=sign * angle),))), Camera(seed=4))
    result = analyze_image(photo, request_id="req_rot", render=False)
    assert result["cards"] == []
    assert {d["code"] for d in result["diagnostics"] if d["severity"] == "error"} == {"AMBIGUOUS_ORIENTATION"}
