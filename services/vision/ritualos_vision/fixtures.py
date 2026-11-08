"""Synthetic board scenarios (ground truth) and fixture generation.

`python -m ritualos_vision.fixtures` renders every scenario from the printable kit PDFs and writes:
  * assets/examples/boards/*.png      gallery images used by the demo and E2E tests
  * tests/fixtures/boards/*.jpg|png   extra CV fixtures (negatives, variations)
  * tests/fixtures/expected-results.json and assets/examples/boards/scenarios.json

Expected results are derived from the scene specification, not from running the detector.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

import cv2
import numpy as np

from . import config
from .synth import Camera, Occluder, PlacedCard, Scene, compose_board, perspective_corners, photograph, rotate_corners

DEMO_LAYOUT: tuple[tuple[int, int, int, str], ...] = (
    (10, 0, 0, "E"),
    (11, 0, 1, "E"),
    (12, 0, 2, "E"),
    (13, 0, 3, "E"),
    (14, 0, 4, "E"),
    (15, 0, 5, "E"),
    (16, 0, 6, "E"),
    (17, 0, 7, "E"),
    (18, 1, 4, "S"),
    (19, 2, 4, "S"),
)
LINEAR_LAYOUT: tuple[tuple[int, int, int, str], ...] = (
    (20, 3, 0, "E"),
    (21, 3, 1, "E"),
    (22, 3, 2, "E"),
    (23, 3, 3, "E"),
    (25, 3, 4, "E"),
    (26, 3, 5, "E"),
    (27, 3, 6, "E"),
)
PROVENANCE = (
    "synthetic: rasterised from assets/board-kit PDFs (pypdfium2), composed and photographed with OpenCV "
    "(warpPerspective, blur, noise, JPEG); not a physical camera capture"
)


def cards_from(
    layout: tuple[tuple[int, int, int, str], ...], overrides: dict[int, dict] | None = None
) -> list[PlacedCard]:
    placed = []
    for marker_id, row, col, orientation in layout:
        extra = (overrides or {}).get(marker_id, {})
        placed.append(PlacedCard(marker_id, row, col, orientation, **extra))
    return placed


@dataclass
class Scenario:
    id: str
    file: str
    gallery: bool
    title_es: str
    description_es: str
    scene: Scene
    camera: Camera
    expected_cards: list[tuple[int, int, int, str]]
    expected_vision_errors: list[str]
    expected_calibrated: bool
    expected_compile_valid: bool
    expected_compile_errors: list[str] = field(default_factory=list)


def _jittered(layout, rng: np.random.Generator, offset_mm: float, angle_deg: float) -> list[PlacedCard]:
    return [
        PlacedCard(
            m,
            r,
            c,
            o,
            offset_mm=(float(rng.uniform(-offset_mm, offset_mm)), float(rng.uniform(-offset_mm, offset_mm))),
            jitter_deg=float(rng.uniform(-angle_deg, angle_deg)),
        )
        for m, r, c, o in layout
    ]


def scenarios() -> list[Scenario]:
    rng = np.random.default_rng(20261108)
    demo = list(DEMO_LAYOUT)
    demo_without = lambda *ids: [card for card in demo if card[0] not in ids]  # noqa: E731
    template_cell = (47.0, 57.0)
    result = [
        Scenario(
            "valid-board",
            "valid-board.png",
            True,
            "Tablero válido (dos ramas)",
            "Las 10 tarjetas del ejemplo oficial: rama SÍ crea y guarda un reporte, rama NO pide revisión.",
            Scene(tuple(cards_from(DEMO_LAYOUT))),
            Camera(seed=1),
            demo,
            [],
            True,
            True,
        ),
        Scenario(
            "valid-board-perspective",
            "valid-board-perspective.png",
            True,
            "Tablero válido en perspectiva",
            "Mismo flujo fotografiado en ángulo, con desenfoque, ruido y tarjetas ligeramente desalineadas.",
            Scene(tuple(_jittered(DEMO_LAYOUT, rng, 2.0, 4.0))),
            Camera(corners=perspective_corners(1.0), blur_sigma=0.9, noise_sigma=3.0, gradient=0.15, seed=2),
            demo,
            [],
            True,
            True,
        ),
        Scenario(
            "valid-board-linear",
            "valid-board-linear.png",
            True,
            "Flujo lineal alternativo",
            "Segundo flujo válido con el juego B (#20–#27): siempre genera un reporte con el estado de validación.",
            Scene(tuple(cards_from(LINEAR_LAYOUT))),
            Camera(corners=rotate_corners(perspective_corners(0.4), 3.0), seed=3),
            list(LINEAR_LAYOUT),
            [],
            True,
            True,
        ),
        Scenario(
            "invalid-board-missing-end",
            "invalid-board-missing-end.png",
            True,
            "Falta una tarjeta FIN",
            "Se retiró FIN #19: la rama NO (PEDIR REVISIÓN #18) queda sin salida y no compila.",
            Scene(tuple(cards_from(tuple(demo_without(19))))),
            Camera(corners=perspective_corners(0.5), seed=4),
            demo_without(19),
            [],
            True,
            False,
            ["DANGLING_OUTPUT", "NONTERMINATING_PATH"],
        ),
        Scenario(
            "invalid-board-ambiguous",
            "invalid-board-ambiguous.png",
            True,
            "Tarjeta entre dos casillas",
            "CREAR REPORTE #15 quedó entre las casillas (0,5) y (1,5): la lectura se bloquea con AMBIGUOUS_POSITION.",
            Scene(tuple(cards_from(DEMO_LAYOUT, {15: {"offset_mm": (0.0, template_cell[1] * 0.45)}}))),
            Camera(seed=5),
            demo_without(15),
            ["AMBIGUOUS_POSITION"],
            True,
            False,
            ["AMBIGUOUS_POSITION"],
        ),
        Scenario(
            "invalid-board-moved-card",
            "invalid-board-moved-card.png",
            True,
            "Tarjeta movida",
            "CREAR REPORTE #15 se movió a (1,5): la rama SÍ queda sin receptor y GUARDAR/FIN quedan inalcanzables.",
            Scene(tuple(cards_from(tuple(demo_without(15)) + ((15, 1, 5, "E"),)))),
            Camera(corners=perspective_corners(0.3), seed=6),
            sorted([*demo_without(15), (15, 1, 5, "E")], key=lambda c: (c[1], c[2], c[0])),
            [],
            True,
            False,
            ["DANGLING_OUTPUT", "UNREACHABLE_NODE"],
        ),
        Scenario(
            "invalid-board-missing-corner",
            "invalid-board-missing-corner.png",
            True,
            "Esquina tapada",
            "Una mano tapa el marcador de esquina 2: sin las 4 esquinas no se calibra la perspectiva.",
            Scene(tuple(cards_from(DEMO_LAYOUT)), occluders=(Occluder((402.0, 279.0), (44.0, 30.0), 20.0),)),
            Camera(seed=7),
            [],
            ["BOARD_FIDUCIAL_MISSING"],
            False,
            False,
            ["BOARD_FIDUCIAL_MISSING"],
        ),
        Scenario(
            "invalid-board-tilted-card",
            "invalid-board-tilted-card.png",
            True,
            "Tarjeta girada en diagonal",
            "CONDICIÓN #14 está girada ~35°: no se puede decidir hacia dónde apunta (AMBIGUOUS_ORIENTATION).",
            Scene(tuple(cards_from(DEMO_LAYOUT, {14: {"jitter_deg": 35.0}}))),
            Camera(seed=8),
            demo_without(14),
            ["AMBIGUOUS_ORIENTATION"],
            True,
            False,
            ["AMBIGUOUS_ORIENTATION"],
        ),
        # ----- test-only fixtures -----
        Scenario(
            "valid-board-rotated-90",
            "valid-board-rotated-90.jpg",
            False,
            "Foto girada 90°",
            "Cámara en vertical.",
            Scene(tuple(cards_from(DEMO_LAYOUT))),
            Camera(rotate90=1, seed=9),
            demo,
            [],
            True,
            True,
        ),
        Scenario(
            "valid-board-rotated-180",
            "valid-board-rotated-180.jpg",
            False,
            "Foto girada 180°",
            "Tablero fotografiado desde el otro lado.",
            Scene(tuple(cards_from(DEMO_LAYOUT))),
            Camera(rotate90=2, corners=perspective_corners(0.6), seed=10),
            demo,
            [],
            True,
            True,
        ),
        Scenario(
            "valid-board-dim",
            "valid-board-dim.jpg",
            False,
            "Poca luz",
            "Exposición baja con gradiente de iluminación.",
            Scene(tuple(cards_from(DEMO_LAYOUT))),
            Camera(brightness=0.5, gradient=0.3, noise_sigma=3.0, seed=11),
            demo,
            [],
            True,
            True,
        ),
        Scenario(
            "valid-board-bright",
            "valid-board-bright.jpg",
            False,
            "Mucha luz",
            "Sobreexposición moderada.",
            Scene(tuple(cards_from(DEMO_LAYOUT))),
            Camera(brightness=1.15, offset=18.0, gradient=0.05, seed=12),
            demo,
            [],
            True,
            True,
        ),
        Scenario(
            "valid-board-small",
            "valid-board-small.jpg",
            False,
            "Resolución baja",
            "Foto de 960×720 del ejemplo oficial.",
            Scene(tuple(cards_from(DEMO_LAYOUT))),
            Camera(width=960, height=720, seed=13),
            demo,
            [],
            True,
            True,
        ),
        Scenario(
            "invalid-board-unknown-card",
            "invalid-board-unknown-card.jpg",
            False,
            "Tarjeta ajena al catálogo",
            "Un marcador ArUco #85 (no registrado) aparece en (3,7).",
            Scene((*cards_from(DEMO_LAYOUT), PlacedCard(85, 3, 7, "E", foreign=True))),
            Camera(seed=14),
            demo,
            ["UNKNOWN_CARD"],
            True,
            False,
            ["UNKNOWN_CARD"],
        ),
        Scenario(
            "invalid-board-duplicate",
            "invalid-board-duplicate.jpg",
            False,
            "Tarjeta duplicada",
            "Dos copias impresas de FIN #17 sobre el tablero.",
            Scene((*cards_from(DEMO_LAYOUT), PlacedCard(17, 3, 0, "E"))),
            Camera(seed=15),
            sorted([*demo, (17, 3, 0, "E")], key=lambda c: (c[1], c[2], c[0])),
            [],
            True,
            False,
            ["DUPLICATE_INSTANCE"],
        ),
        Scenario(
            "invalid-board-occluded",
            "invalid-board-occluded.jpg",
            False,
            "Marcador tapado",
            "Un dedo tapa EXTRAER TEXTO #12: no se inventa la tarjeta, el flujo queda roto.",
            Scene(tuple(cards_from(DEMO_LAYOUT)), occluders=(Occluder((139.5, 63.0), (20.0, 32.0), 10.0),)),
            Camera(seed=16),
            demo_without(12),
            [],
            True,
            False,
            ["DANGLING_OUTPUT", "UNREACHABLE_NODE"],
        ),
        Scenario(
            "blank-table",
            "blank-table.jpg",
            False,
            "Sin tablero",
            "Solo la mesa: no hay marcadores.",
            Scene(()),
            Camera(seed=17),
            [],
            ["NO_MARKERS_FOUND"],
            False,
            False,
            ["NO_MARKERS_FOUND"],
        ),
    ]
    return result


def render_scenario(scenario: Scenario) -> np.ndarray:
    if scenario.id == "blank-table":
        board = np.full((1188, 1680, 3), (70, 98, 128), dtype=np.uint8)  # only the table colour, no kit
        return photograph(board, Camera(corners=((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)), seed=17))
    return photograph(compose_board(scenario.scene), scenario.camera)


def expected_entry(scenario: Scenario, relative_file: str) -> dict:
    return {
        "id": scenario.id,
        "file": relative_file,
        "gallery": scenario.gallery,
        "titleEs": scenario.title_es,
        "descriptionEs": scenario.description_es,
        "provenance": PROVENANCE,
        "camera": asdict(scenario.camera),
        "vision": {
            "calibrated": scenario.expected_calibrated,
            "cards": [
                {"markerId": m, "row": r, "col": c, "orientation": o}
                for m, r, c, o in sorted(scenario.expected_cards, key=lambda x: (x[1], x[2], x[0]))
            ],
            "errorCodes": sorted(set(scenario.expected_vision_errors)),
        },
        "compile": {
            "valid": scenario.expected_compile_valid,
            "errorCodes": sorted(set(scenario.expected_compile_errors)),
        },
    }


def write_image(path: Path, image: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix == ".png":
        ok, buffer = cv2.imencode(".png", image, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    else:
        ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 92])
    if not ok:
        raise RuntimeError(f"encode failed for {path}")
    path.write_bytes(buffer.tobytes())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(config.REPO_ROOT / "assets" / "examples" / "boards"))
    parser.add_argument("--tests-out", default=str(config.REPO_ROOT / "tests" / "fixtures" / "boards"))
    args = parser.parse_args()
    gallery_dir = Path(args.out)
    tests_dir = Path(args.tests_out)
    entries = []
    gallery = []
    for scenario in scenarios():
        image = render_scenario(scenario)
        target_dir = gallery_dir if scenario.gallery else tests_dir
        target = target_dir / scenario.file
        write_image(target, image)
        relative = target.resolve().relative_to(config.REPO_ROOT).as_posix()
        entry = expected_entry(scenario, relative)
        entries.append(entry)
        if scenario.gallery:
            gallery.append(
                {
                    key: entry[key]
                    for key in ("id", "file", "titleEs", "descriptionEs", "provenance", "vision", "compile")
                }
            )
        print(f"wrote {relative} ({target.stat().st_size // 1024} KB)")
    # Corrupt file fixture (valid PNG signature, truncated body).
    corrupt = tests_dir / "corrupt-image.png"
    corrupt.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + b"\x00" * 7)
    expected = {
        "generatedBy": "python -m ritualos_vision.fixtures",
        "note": (
            "Ground truth from the scene specifications. "
            "Tests compare detector output against it; the detector never reads it."
        ),
        "boards": entries,
        "negativeFiles": [
            {
                "file": corrupt.resolve().relative_to(config.REPO_ROOT).as_posix(),
                "httpStatus": 422,
                "code": "IMAGE_CORRUPT",
            }
        ],
    }
    expected_path = config.REPO_ROOT / "tests" / "fixtures" / "expected-results.json"
    expected_path.write_text(json.dumps(expected, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (gallery_dir / "scenarios.json").write_text(
        json.dumps({"scenarios": gallery}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"wrote {expected_path.relative_to(config.REPO_ROOT)}")


if __name__ == "__main__":
    main()
