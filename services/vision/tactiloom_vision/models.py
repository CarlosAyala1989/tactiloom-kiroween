"""Pydantic mirror of the DetectionResult contract (packages/contracts/schemas/detection-result.v1.schema.json).

The JSON Schema generated from Zod is the published contract; these models validate every
response at runtime and tests/test_contracts.py checks both against each other.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Orientation = Literal["N", "E", "S", "W"]
CardKind = Literal[
    "START",
    "INPUT_FILE",
    "EXTRACT_TEXT",
    "VALIDATE_FIELDS",
    "CONDITION",
    "CREATE_REPORT",
    "SAVE_REPORT",
    "REQUEST_REVIEW",
    "END",
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Point(Strict):
    x: float
    y: float


class Cell(Strict):
    row: int = Field(ge=0, le=63)
    col: int = Field(ge=0, le=63)


class Diagnostic(Strict):
    code: str
    severity: Literal["error", "warning", "info"]
    stage: Literal["vision", "compiler", "runtime"]
    message: str = Field(min_length=1, max_length=500)
    markerIds: list[int] | None = None
    cells: list[Cell] | None = None
    nodeIds: list[str] | None = None
    suggestion: str | None = Field(default=None, max_length=500)


class ImageInfo(Strict):
    width: int = Field(gt=0)
    height: int = Field(gt=0)


class BoardInfo(Strict):
    templateId: Literal["board-v1"]
    columns: int = Field(gt=0)
    rows: int = Field(gt=0)
    calibrated: bool
    fiducialsFound: list[int]
    fiducialsMissing: list[int]
    reprojectionErrorMm: float | None = Field(default=None, ge=0)
    homography: list[float] | None = Field(default=None, min_length=9, max_length=9)


class Offset(Strict):
    dx: float
    dy: float


class DetectedCard(Strict):
    markerId: int
    row: int = Field(ge=0, le=63)
    col: int = Field(ge=0, le=63)
    orientation: Orientation
    quality: float | None = Field(default=None, ge=0, le=1)
    cardInstanceId: str
    type: CardKind
    centerMm: Point
    centerCanonical: Point
    offset: Offset
    angleDeg: float
    angleDeviationDeg: float = Field(ge=0)
    sideMm: float = Field(ge=0)
    cornersImage: list[tuple[float, float]] = Field(min_length=4, max_length=4)


class RejectedMarker(Strict):
    markerId: int
    reason: str
    centerImage: Point
    centerMm: Point | None
    candidateCells: list[Cell] = Field(max_length=4)
    cornersImage: list[tuple[float, float]] = Field(min_length=4, max_length=4)


class Metrics(Strict):
    decodeMs: float = Field(ge=0)
    detectMs: float = Field(ge=0)
    calibrateMs: float = Field(ge=0)
    assignMs: float = Field(ge=0)
    overlayMs: float = Field(ge=0)
    totalMs: float = Field(ge=0)
    markersDetected: int = Field(ge=0)


class Overlay(Strict):
    mime: Literal["image/jpeg", "image/png"]
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    dataBase64: str = Field(min_length=1)


class DetectionResult(Strict):
    protocolVersion: Literal["tactiloom-board/1"]
    requestId: str = Field(min_length=1, max_length=100)
    detectorVersion: str
    sourceMode: Literal["physical", "image"]
    image: ImageInfo
    board: BoardInfo
    cards: list[DetectedCard] = Field(max_length=64)
    rejectedMarkers: list[RejectedMarker] = Field(max_length=200)
    diagnostics: list[Diagnostic] = Field(max_length=200)
    metrics: Metrics
    overlay: Overlay | None
