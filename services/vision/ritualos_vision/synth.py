"""Synthetic board photographs built from the REAL printable kit.

The board and cards are rasterised from assets/board-kit/*.pdf with pypdfium2, composed in the
board plane (each card rotated to its orientation and pasted on its cell), then "photographed":
perspective warp onto a table background, lighting, blur, noise and JPEG artefacts. The detector
must recover everything from these pixels. Scene specs are the ground truth; they are never fed
to the detector.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

from . import config
from .aruco import render_marker
from .catalog import load_template

ROTATIONS = {"E": None, "S": cv2.ROTATE_90_CLOCKWISE, "W": cv2.ROTATE_180, "N": cv2.ROTATE_90_COUNTERCLOCKWISE}


@dataclass(frozen=True)
class PlacedCard:
    marker_id: int
    row: int
    col: int
    orientation: str
    offset_mm: tuple[float, float] = (0.0, 0.0)
    jitter_deg: float = 0.0
    foreign: bool = False  # not part of the printed kit: drawn directly with OpenCV


@dataclass(frozen=True)
class Occluder:
    """Opaque blob (finger/hand/object) in board millimetres."""

    center_mm: tuple[float, float]
    size_mm: tuple[float, float]
    angle_deg: float = 0.0


@dataclass(frozen=True)
class Camera:
    width: int = 1400
    height: int = 1050
    # Destination of the board page corners (TL, TR, BR, BL) as fractions of the output image.
    corners: tuple[tuple[float, float], ...] = ((0.05, 0.08), (0.95, 0.08), (0.95, 0.92), (0.05, 0.92))
    rotate90: int = 0
    blur_sigma: float = 0.6
    noise_sigma: float = 2.0
    brightness: float = 1.0
    offset: float = 0.0
    gradient: float = 0.08
    jpeg_quality: int | None = 90
    seed: int = 0


@dataclass(frozen=True)
class Scene:
    cards: tuple[PlacedCard, ...]
    occluders: tuple[Occluder, ...] = field(default_factory=tuple)
    px_per_mm: float = 4.0


def render_pdf_page(path: Path, page_index: int, px_per_mm: float) -> np.ndarray:
    import pypdfium2 as pdfium  # dev dependency (fixtures/benchmark only)

    pdf = pdfium.PdfDocument(str(path))
    try:
        page = pdf[page_index]
        bitmap = page.render(scale=px_per_mm * 25.4 / 72.0)
        image = np.asarray(bitmap.to_pil().convert("RGB"))[:, :, ::-1].copy()
        page.close()
    finally:
        pdf.close()
    return image


class KitRaster:
    """Raster of the printable kit at a given resolution (px per mm)."""

    def __init__(self, px_per_mm: float = 4.0, kit_dir: Path | None = None) -> None:
        kit_dir = kit_dir or config.KIT_DIR
        self.px_per_mm = px_per_mm
        self.template = load_template()
        self.board = render_pdf_page(kit_dir / "board-v1-a3.pdf", 0, px_per_mm)
        layout = json.loads((kit_dir / "cards-v1-layout.json").read_text(encoding="utf-8"))
        pages = {
            index: render_pdf_page(kit_dir / "cards-v1-a4.pdf", index, px_per_mm) for index in range(layout["pages"])
        }
        self.cards: dict[int, np.ndarray] = {}
        for slot in layout["slots"]:
            x0 = round(slot["x"] * px_per_mm)
            y0 = round(slot["y"] * px_per_mm)
            x1 = round((slot["x"] + slot["width"]) * px_per_mm)
            y1 = round((slot["y"] + slot["height"]) * px_per_mm)
            self.cards[int(slot["markerId"])] = pages[slot["page"]][y0:y1, x0:x1].copy()

    def card_image(self, card: PlacedCard) -> np.ndarray:
        if not card.foreign:
            return self.cards[card.marker_id]
        # A card from outside the catalog (e.g. #85) with a real ArUco marker drawn by OpenCV.
        t = self.template
        ppm = self.px_per_mm
        w, h = round(t.card_width * ppm), round(t.card_height * ppm)
        image = np.full((h, w, 3), 250, dtype=np.uint8)
        side = round(t.card_marker_size * ppm)
        marker = cv2.cvtColor(render_marker(card.marker_id, side), cv2.COLOR_GRAY2BGR)
        mx = round(t.card_marker_center[0] * ppm - side / 2)
        my = round(t.card_marker_center[1] * ppm - side / 2)
        image[my : my + side, mx : mx + side] = marker
        cv2.putText(image, f"#{card.marker_id}", (8, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (60, 60, 60), 2, cv2.LINE_AA)
        return image


@lru_cache(maxsize=4)
def get_kit_raster(px_per_mm: float = 4.0) -> KitRaster:
    return KitRaster(px_per_mm)


def _card_mask(height: int, width: int, radius_px: float) -> np.ndarray:
    mask = np.zeros((height, width), dtype=np.uint8)
    r = int(round(radius_px))
    cv2.rectangle(mask, (r, 0), (width - 1 - r, height - 1), 255, -1)
    cv2.rectangle(mask, (0, r), (width - 1, height - 1 - r), 255, -1)
    for cx, cy in ((r, r), (width - 1 - r, r), (width - 1 - r, height - 1 - r), (r, height - 1 - r)):
        cv2.circle(mask, (cx, cy), r, 255, -1, cv2.LINE_AA)
    return mask


def compose_board(scene: Scene, kit: KitRaster | None = None) -> np.ndarray:
    """Board plane image (page pixels) with the cards placed and occluders drawn."""
    kit = kit or get_kit_raster(scene.px_per_mm)
    t = kit.template
    ppm = kit.px_per_mm
    board = kit.board.astype(np.float32)
    height, width = board.shape[:2]
    for card in scene.cards:
        image = kit.card_image(card)
        mask = _card_mask(image.shape[0], image.shape[1], 2.5 * ppm)
        if ROTATIONS[card.orientation] is not None:
            image = cv2.rotate(image, ROTATIONS[card.orientation])
            mask = cv2.rotate(mask, ROTATIONS[card.orientation])
        cx_mm, cy_mm = t.cell_center_mm(card.row, card.col)
        cx = (cx_mm + card.offset_mm[0]) * ppm
        cy = (cy_mm + card.offset_mm[1]) * ppm
        h, w = image.shape[:2]
        # Affine: card centre → (cx, cy) with optional small rotation (positive = clockwise on screen).
        rotation = cv2.getRotationMatrix2D((w / 2, h / 2), -card.jitter_deg, 1.0)
        rotation[0, 2] += cx - w / 2
        rotation[1, 2] += cy - h / 2
        warped = cv2.warpAffine(image, rotation, (width, height), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0))
        alpha = cv2.warpAffine(mask, rotation, (width, height), flags=cv2.INTER_LINEAR, borderValue=0)
        alpha_f = (alpha.astype(np.float32) / 255.0)[:, :, None]
        shadow = cv2.GaussianBlur(alpha, (0, 0), 1.2 * ppm)
        shadow = np.roll(shadow, (round(0.8 * ppm), round(0.6 * ppm)), axis=(0, 1))
        board *= 1.0 - 0.22 * (shadow.astype(np.float32) / 255.0)[:, :, None]
        board = board * (1.0 - alpha_f) + warped.astype(np.float32) * alpha_f
    for occluder in scene.occluders:
        center = (round(occluder.center_mm[0] * ppm), round(occluder.center_mm[1] * ppm))
        axes = (round(occluder.size_mm[0] * ppm / 2), round(occluder.size_mm[1] * ppm / 2))
        overlay = board.copy()
        cv2.ellipse(overlay, center, axes, occluder.angle_deg, 0, 360, (120, 150, 196), -1, cv2.LINE_AA)
        board = cv2.addWeighted(overlay, 0.97, board, 0.03, 0)
    return np.clip(board, 0, 255).astype(np.uint8)


def _table_background(width: int, height: int, rng: np.random.Generator) -> np.ndarray:
    base = np.empty((height, width, 3), dtype=np.float32)
    base[:] = (70, 98, 128)  # warm wooden table (BGR)
    low = cv2.resize(rng.normal(0, 1, (12, 16)).astype(np.float32), (width, height), interpolation=cv2.INTER_CUBIC)
    grain = cv2.GaussianBlur(rng.normal(0, 1, (height, width)).astype(np.float32), (0, 0), sigmaX=6, sigmaY=0.8)
    base += (low * 10 + grain * 6)[:, :, None]
    return base


def photograph(board_image: np.ndarray, camera: Camera) -> np.ndarray:
    """Simulated photo (BGR uint8) of the composed board under `camera`."""
    rng = np.random.default_rng(camera.seed)
    bh, bw = board_image.shape[:2]
    src = np.array([[0, 0], [bw, 0], [bw, bh], [0, bh]], dtype=np.float32)
    dst = np.array([[x * camera.width, y * camera.height] for x, y in camera.corners], dtype=np.float32)
    matrix = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(board_image, matrix, (camera.width, camera.height), flags=cv2.INTER_LINEAR)
    mask = cv2.warpPerspective(
        np.full((bh, bw), 255, np.uint8), matrix, (camera.width, camera.height), flags=cv2.INTER_LINEAR
    )
    alpha = (mask.astype(np.float32) / 255.0)[:, :, None]
    photo = _table_background(camera.width, camera.height, rng) * (1.0 - alpha) + warped.astype(np.float32) * alpha
    if camera.gradient:
        xs = np.linspace(-1, 1, camera.width, dtype=np.float32)[None, :]
        ys = np.linspace(-1, 1, camera.height, dtype=np.float32)[:, None]
        light = 1.0 - camera.gradient * (0.6 * xs + 0.4 * ys) - 0.5 * camera.gradient * (xs**2 + ys**2)
        photo *= light[:, :, None]
    photo = photo * camera.brightness + camera.offset
    if camera.blur_sigma > 0:
        photo = cv2.GaussianBlur(photo, (0, 0), camera.blur_sigma)
    if camera.noise_sigma > 0:
        photo += rng.normal(0, camera.noise_sigma, photo.shape).astype(np.float32)
    image = np.clip(photo, 0, 255).astype(np.uint8)
    if camera.rotate90 % 4:
        image = np.ascontiguousarray(np.rot90(image, k=-(camera.rotate90 % 4)))
    if camera.jpeg_quality is not None:
        ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, int(camera.jpeg_quality)])
        if not ok:
            raise RuntimeError("JPEG encode failed")
        image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    return image


def perspective_corners(strength: float, rng: np.random.Generator | None = None) -> tuple[tuple[float, float], ...]:
    """Trapezoid-like destination corners; strength 0 = frontal, 1 = strong tilt."""
    s = strength
    corners = [
        (0.05 + 0.11 * s, 0.08 + 0.06 * s),
        (0.95 - 0.09 * s, 0.08 + 0.02 * s),
        (0.95 + 0.02 * s, 0.92 - 0.02 * s),
        (0.05 - 0.01 * s, 0.92 + 0.03 * s),
    ]
    if rng is not None:
        corners = [(x + rng.uniform(-0.015, 0.015), y + rng.uniform(-0.015, 0.015)) for x, y in corners]
    return tuple((min(max(x, 0.0), 1.0), min(max(y, 0.0), 1.0)) for x, y in corners)


def rotate_corners(corners: tuple[tuple[float, float], ...], degrees: float) -> tuple[tuple[float, float], ...]:
    """Rotate destination corners around the image centre (in-plane camera roll, small angles)."""
    angle = math.radians(degrees)
    out = []
    for x, y in corners:
        dx, dy = x - 0.5, y - 0.5
        out.append(
            (0.5 + dx * math.cos(angle) - dy * math.sin(angle), 0.5 + dx * math.sin(angle) + dy * math.cos(angle))
        )
    return tuple(out)
