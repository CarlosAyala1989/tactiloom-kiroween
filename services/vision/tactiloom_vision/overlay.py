"""Overlay rendering. Every shape comes from the detector output: nothing is drawn that was not detected."""

from __future__ import annotations

import base64
from dataclasses import dataclass

import cv2
import numpy as np

from . import config


@dataclass
class OverlayShape:
    points: np.ndarray  # (N, 2) image pixels (full resolution)
    color: tuple[int, int, int]
    thickness: int
    closed: bool
    label: str | None
    label_at: tuple[float, float] | None
    arrow: tuple[tuple[float, float], tuple[float, float]] | None = None


def _ascii(text: str) -> str:
    replacements = str.maketrans("áéíóúÁÉÍÓÚñÑ", "aeiouAEIOUnN")
    return text.translate(replacements).encode("ascii", "replace").decode("ascii")


def _label(image: np.ndarray, text: str, origin: tuple[int, int], color: tuple[int, int, int], scale: float) -> None:
    font = cv2.FONT_HERSHEY_SIMPLEX
    thickness = max(1, round(scale * 2))
    (tw, th), baseline = cv2.getTextSize(text, font, scale, thickness)
    x = int(min(max(origin[0], 0), max(image.shape[1] - tw - 4, 0)))
    y = int(min(max(origin[1] - 6, th + 4), image.shape[0] - baseline - 2))
    cv2.rectangle(image, (x - 2, y - th - 4), (x + tw + 2, y + baseline), (20, 20, 20), -1)
    cv2.putText(image, text, (x, y), font, scale, color, thickness, cv2.LINE_AA)


def render_overlay(image_bgr: np.ndarray, shapes: list[OverlayShape], header: str) -> tuple[str, int, int]:
    """Draw shapes on a (possibly downscaled) copy and return (base64 JPEG, width, height)."""
    height, width = image_bgr.shape[:2]
    scale = min(1.0, config.OVERLAY_MAX_WIDTH / float(width))
    canvas = (
        image_bgr
        if scale == 1.0
        else cv2.resize(image_bgr, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA)
    )
    canvas = canvas.copy()
    text_scale = max(0.4, canvas.shape[1] / 2600.0)
    for shape in shapes:
        pts = np.round(shape.points * scale).astype(np.int32).reshape(-1, 1, 2)
        cv2.polylines(canvas, [pts], shape.closed, shape.color, shape.thickness, cv2.LINE_AA)
        if shape.arrow is not None:
            start = tuple(int(round(v * scale)) for v in shape.arrow[0])
            end = tuple(int(round(v * scale)) for v in shape.arrow[1])
            cv2.arrowedLine(canvas, start, end, shape.color, max(2, shape.thickness + 1), cv2.LINE_AA, tipLength=0.3)
            cv2.circle(canvas, start, max(3, shape.thickness + 1), shape.color, -1, cv2.LINE_AA)
        if shape.label and shape.label_at is not None:
            origin = (int(shape.label_at[0] * scale), int(shape.label_at[1] * scale))
            _label(canvas, _ascii(shape.label), origin, shape.color, text_scale)
    _label(canvas, _ascii(header), (8, int(30 * max(1.0, text_scale * 2))), (255, 255, 255), text_scale * 1.2)
    ok, buffer = cv2.imencode(".jpg", canvas, [cv2.IMWRITE_JPEG_QUALITY, 82])
    if not ok:
        raise RuntimeError("No se pudo codificar el overlay")
    return base64.b64encode(buffer.tobytes()).decode("ascii"), int(canvas.shape[1]), int(canvas.shape[0])
