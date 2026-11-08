"""Board template and card catalog loaded from packages/contracts/catalog (single source of truth)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache

import numpy as np

from . import config


@dataclass(frozen=True)
class Fiducial:
    marker_id: int
    corner: str
    center_x: float
    center_y: float
    size: float

    def corners_mm(self) -> np.ndarray:
        """Corners in ArUco order (TL, TR, BR, BL) of the upright printed marker, in board mm."""
        half = self.size / 2
        cx, cy = self.center_x, self.center_y
        return np.array(
            [[cx - half, cy - half], [cx + half, cy - half], [cx + half, cy + half], [cx - half, cy + half]],
            dtype=np.float64,
        )


@dataclass(frozen=True)
class BoardTemplate:
    template_id: str
    columns: int
    rows: int
    page_width: float
    page_height: float
    grid_x: float
    grid_y: float
    cell_width: float
    cell_height: float
    fiducials: tuple[Fiducial, ...]
    card_width: float
    card_height: float
    card_marker_size: float
    card_marker_center: tuple[float, float]
    canonical_width: float
    canonical_height: float
    tol_axis: float
    tol_orientation_deg: float
    tol_marker_size: float
    max_reprojection_mm: float

    @property
    def grid_width(self) -> float:
        return self.columns * self.cell_width

    @property
    def grid_height(self) -> float:
        return self.rows * self.cell_height

    def fiducial(self, marker_id: int) -> Fiducial:
        return next(f for f in self.fiducials if f.marker_id == marker_id)

    def cell_center_mm(self, row: int, col: int) -> tuple[float, float]:
        return (self.grid_x + (col + 0.5) * self.cell_width, self.grid_y + (row + 0.5) * self.cell_height)

    def to_canonical(self, x_mm: float, y_mm: float) -> tuple[float, float]:
        return (
            (x_mm - self.grid_x) / self.grid_width * self.canonical_width,
            (y_mm - self.grid_y) / self.grid_height * self.canonical_height,
        )


@dataclass(frozen=True)
class CatalogEntry:
    marker_id: int
    kind: str
    card_instance_id: str
    enabled: bool


@lru_cache(maxsize=1)
def load_template() -> BoardTemplate:
    data = json.loads((config.CATALOG_DIR / "board-v1.json").read_text(encoding="utf-8"))
    grid = data["grid"]
    card = data["card"]
    tol = data["tolerances"]
    return BoardTemplate(
        template_id=data["templateId"],
        columns=int(data["columns"]),
        rows=int(data["rows"]),
        page_width=float(data["page"]["width"]),
        page_height=float(data["page"]["height"]),
        grid_x=float(grid["x"]),
        grid_y=float(grid["y"]),
        cell_width=float(grid["cellWidth"]),
        cell_height=float(grid["cellHeight"]),
        fiducials=tuple(
            Fiducial(
                marker_id=int(f["markerId"]),
                corner=f["corner"],
                center_x=float(f["center"]["x"]),
                center_y=float(f["center"]["y"]),
                size=float(f["size"]),
            )
            for f in data["fiducials"]
        ),
        card_width=float(card["width"]),
        card_height=float(card["height"]),
        card_marker_size=float(card["markerSize"]),
        card_marker_center=(float(card["markerCenter"]["x"]), float(card["markerCenter"]["y"])),
        canonical_width=float(data["canonical"]["width"]),
        canonical_height=float(data["canonical"]["height"]),
        tol_axis=float(tol["cellCenterAxisFraction"]),
        tol_orientation_deg=float(tol["orientationDegrees"]),
        tol_marker_size=float(tol["markerSizeRelative"]),
        max_reprojection_mm=float(tol["maxReprojectionErrorMm"]),
    )


@lru_cache(maxsize=1)
def load_catalog() -> dict[int, CatalogEntry]:
    data = json.loads((config.CATALOG_DIR / "cards-v1.json").read_text(encoding="utf-8"))
    return {
        int(card["markerId"]): CatalogEntry(
            marker_id=int(card["markerId"]),
            kind=card["kind"],
            card_instance_id=card["cardInstanceId"],
            enabled=bool(card["enabled"]),
        )
        for card in data["cards"]
    }


FIDUCIAL_IDS = (0, 1, 2, 3)
CORNER_NAMES_ES = {0: "superior izquierda", 1: "superior derecha", 2: "inferior derecha", 3: "inferior izquierda"}
