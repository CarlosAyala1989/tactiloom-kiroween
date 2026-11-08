"""Reproducible SYNTHETIC vision benchmark (not a physical-camera benchmark).

python -m tactiloom_vision.benchmark --scenes 120 --seed 7 --out docs/benchmark-results/synthetic-latest.json

Each scene: random legal placement of catalog cards (rendered from the real kit PDFs) photographed
under a random condition bucket (perspective, lighting, resolution, blur, noise, JPEG). Metrics are
computed against the scene specification (ground truth).
"""

from __future__ import annotations

import argparse
import json
import platform
import statistics
import time
from collections import Counter
from pathlib import Path

import cv2
import numpy as np

from . import DETECTOR_VERSION
from .catalog import load_catalog, load_template
from .detector import analyze_image
from .synth import Camera, PlacedCard, Scene, compose_board, perspective_corners, photograph, rotate_corners

CONDITIONS = {
    "frontal-normal": {
        "strength": (0.0, 0.15),
        "brightness": (0.95, 1.05),
        "blur": (0.3, 0.7),
        "noise": (1.0, 2.5),
        "size": (1400, 1050),
    },
    "perspective-normal": {
        "strength": (0.5, 1.0),
        "brightness": (0.9, 1.1),
        "blur": (0.5, 1.0),
        "noise": (1.5, 3.0),
        "size": (1400, 1050),
    },
    "low-light": {
        "strength": (0.0, 0.6),
        "brightness": (0.45, 0.6),
        "blur": (0.5, 1.0),
        "noise": (3.0, 5.0),
        "size": (1400, 1050),
    },
    "low-resolution": {
        "strength": (0.0, 0.6),
        "brightness": (0.9, 1.1),
        "blur": (0.4, 0.9),
        "noise": (1.5, 3.0),
        "size": (960, 720),
    },
    "high-resolution": {
        "strength": (0.0, 0.8),
        "brightness": (0.9, 1.1),
        "blur": (0.6, 1.4),
        "noise": (1.5, 3.0),
        "size": (1920, 1440),
    },
    "strong-blur": {
        "strength": (0.0, 0.5),
        "brightness": (0.9, 1.1),
        "blur": (1.6, 2.2),
        "noise": (1.5, 3.0),
        "size": (1400, 1050),
    },
}


def random_scene(rng: np.random.Generator) -> list[PlacedCard]:
    template = load_template()
    ids = sorted(e.marker_id for e in load_catalog().values() if e.enabled)
    count = int(rng.integers(4, 13))
    markers = rng.choice(ids, size=count, replace=False)
    cells = rng.choice(template.rows * template.columns, size=count, replace=False)
    cards = []
    for marker, cell in zip(markers, cells, strict=True):
        row, col = divmod(int(cell), template.columns)
        cards.append(
            PlacedCard(
                int(marker),
                row,
                col,
                str(rng.choice(["N", "E", "S", "W"])),
                offset_mm=(float(rng.uniform(-3, 3)), float(rng.uniform(-3, 3))),
                jitter_deg=float(rng.uniform(-7, 7)),
            )
        )
    return cards


def camera_for(condition: str, rng: np.random.Generator, seed: int) -> Camera:
    spec = CONDITIONS[condition]
    width, height = spec["size"]
    corners = rotate_corners(perspective_corners(float(rng.uniform(*spec["strength"])), rng), float(rng.uniform(-5, 5)))
    return Camera(
        width=width,
        height=height,
        corners=corners,
        rotate90=int(rng.integers(0, 4)),
        blur_sigma=float(rng.uniform(*spec["blur"])),
        noise_sigma=float(rng.uniform(*spec["noise"])),
        brightness=float(rng.uniform(*spec["brightness"])),
        gradient=float(rng.uniform(0.0, 0.25)),
        jpeg_quality=int(rng.choice([75, 85, 92])),
        seed=seed,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenes", type=int, default=120)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--out", type=str, default="")
    args = parser.parse_args()
    rng = np.random.default_rng(args.seed)
    per_condition: dict[str, dict] = {}
    latencies: list[float] = []
    failures: Counter[str] = Counter()
    totals = Counter()
    conditions = list(CONDITIONS)
    for index in range(args.scenes):
        condition = conditions[index % len(conditions)]
        cards = random_scene(rng)
        photo = photograph(compose_board(Scene(tuple(cards))), camera_for(condition, rng, args.seed * 1000 + index))
        started = time.perf_counter()
        result = analyze_image(photo, request_id=f"req_bench_{index}", render=False)
        latencies.append((time.perf_counter() - started) * 1000)
        bucket = per_condition.setdefault(condition, Counter())
        bucket["scenes"] += 1
        expected = {c.marker_id: (c.row, c.col, c.orientation) for c in cards}
        detected = {c["markerId"]: (c["row"], c["col"], c["orientation"]) for c in result["cards"]}
        calibrated = result["board"]["calibrated"]
        bucket["calibrated"] += int(calibrated)
        for marker, (row, col, orientation) in expected.items():
            bucket["cards"] += 1
            got = detected.get(marker)
            if got is None:
                reason = next(
                    (r["reason"] for r in result["rejectedMarkers"] if r["markerId"] == marker), "NOT_DETECTED"
                )
                failures[reason if calibrated else "BOARD_NOT_CALIBRATED"] += 1
                continue
            bucket["id_ok"] += 1
            bucket["cell_ok"] += int(got[:2] == (row, col))
            bucket["orientation_ok"] += int(got[2] == orientation)
            bucket["all_ok"] += int(got == (row, col, orientation))
        bucket["false_positive"] += sum(1 for marker in detected if marker not in expected)
        bucket["perfect_scene"] += int(detected == expected)
    for name in (
        "scenes",
        "calibrated",
        "cards",
        "id_ok",
        "cell_ok",
        "orientation_ok",
        "all_ok",
        "false_positive",
        "perfect_scene",
    ):
        totals[name] = sum(bucket[name] for bucket in per_condition.values())

    def rates(bucket: Counter) -> dict:
        cards = max(bucket["cards"], 1)
        identified = max(bucket["id_ok"], 1)
        return {
            "scenes": bucket["scenes"],
            "boardsCalibrated": f"{bucket['calibrated']}/{bucket['scenes']}",
            "cardIdRecall": round(bucket["id_ok"] / cards, 4),
            "cellAccuracyOfIdentified": round(bucket["cell_ok"] / identified, 4),
            "orientationAccuracyOfIdentified": round(bucket["orientation_ok"] / identified, 4),
            "fullyCorrectCards": round(bucket["all_ok"] / cards, 4),
            "falsePositiveCards": bucket["false_positive"],
            "perfectScenes": f"{bucket['perfect_scene']}/{bucket['scenes']}",
        }

    report = {
        "kind": "synthetic",
        "warning": (
            "Imágenes sintéticas renderizadas desde el kit; NO sustituye pruebas con cámara y tarjetas impresas."
        ),
        "detectorVersion": DETECTOR_VERSION,
        "opencv": cv2.__version__,
        "machine": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "processor": platform.processor() or platform.machine(),
        },
        "seed": args.seed,
        "overall": rates(totals),
        "byCondition": {name: rates(bucket) for name, bucket in per_condition.items()},
        "latencyMs": {
            "median": round(statistics.median(latencies), 1),
            "p95": round(float(np.percentile(latencies, 95)), 1),
            "max": round(max(latencies), 1),
            "note": "analyze_image() sin overlay, un hilo; excluye decodificación y red",
        },
        "missedCardReasons": dict(failures.most_common()),
    }
    text = json.dumps(report, indent=2, ensure_ascii=False)
    print(text)
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(text + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
