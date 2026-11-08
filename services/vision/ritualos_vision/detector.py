"""Board reading pipeline (Ritual Board Grammar v1, see docs/physical-grammar-v1.md).

pixels → ArUco markers → 4 fiducials → homography (16 corner correspondences) → card marker
geometry in board millimetres → cell + N/E/S/W orientation → DetectionResult.

Nothing here executes workflows: the output is data only.
"""

from __future__ import annotations

import math
import threading
import time
import uuid
from dataclasses import dataclass, field

import cv2
import numpy as np

from . import DETECTOR_VERSION, config
from .aruco import create_detector
from .catalog import CORNER_NAMES_ES, FIDUCIAL_IDS, BoardTemplate, CatalogEntry, load_catalog, load_template
from .overlay import OverlayShape, render_overlay

ORIENTATION_BY_QUADRANT = {0: "E", 1: "S", 2: "W", 3: "N"}
ORIENTATION_NAMES_ES = {"N": "norte", "E": "este", "S": "sur", "W": "oeste"}
SEVERITY_ORDER = {"error": 0, "warning": 1, "info": 2}
# Max side/diagonal ratio of a detected quad in image space (perspective may elongate real markers).
IMAGE_MAX_SIDE_RATIO = 3.0
# Max side/diagonal ratio after rectification to board millimetres (real markers are squares).
BOARD_MAX_SIDE_RATIO = 1.35

COLOR_OK = (70, 190, 60)
COLOR_WARN = (0, 170, 255)
COLOR_ERROR = (60, 60, 235)
COLOR_FIDUCIAL = (255, 190, 0)
COLOR_GRID = (240, 240, 240)

_local = threading.local()


def _detector() -> cv2.aruco.ArucoDetector:
    detector = getattr(_local, "detector", None)
    if detector is None:
        detector = create_detector()
        _local.detector = detector
    return detector


@dataclass
class RawMarker:
    marker_id: int
    corners: np.ndarray  # (4, 2) float64, full-resolution image pixels, ArUco order TL,TR,BR,BL

    @property
    def center(self) -> np.ndarray:
        return self.corners.mean(axis=0)


@dataclass
class Analysis:
    result: dict
    shapes: list[OverlayShape] = field(default_factory=list)


def new_request_id() -> str:
    return f"req_{uuid.uuid4().hex[:20]}"


def _side_lengths(corners: np.ndarray) -> list[float]:
    return [float(np.linalg.norm(corners[(i + 1) % 4] - corners[i])) for i in range(4)]


def _plausible_quad(corners: np.ndarray, max_ratio: float) -> bool:
    """Real markers are squares; reject slivers (typical false positives on text or card edges)."""
    sides = _side_lengths(corners)
    diagonals = [float(np.linalg.norm(corners[2] - corners[0])), float(np.linalg.norm(corners[3] - corners[1]))]
    if min(sides) <= 1e-6 or min(diagonals) <= 1e-6:
        return False
    return max(sides) / min(sides) <= max_ratio and max(diagonals) / min(diagonals) <= max_ratio


def _run_detector(work: np.ndarray, scale: float) -> list[RawMarker]:
    corners, ids, _rejected = _detector().detectMarkers(work)
    if ids is None:
        return []
    return [
        RawMarker(int(marker_id), np.asarray(quad, dtype=np.float64).reshape(4, 2) / scale)
        for quad, marker_id in zip(corners, ids.ravel(), strict=True)
    ]


def _sharpened(gray: np.ndarray) -> np.ndarray:
    """Unsharp mask + CLAHE: recovers fiducials softened by focus blur (see docs/benchmarking.md)."""
    blurred = cv2.GaussianBlur(gray, (0, 0), 2.0)
    sharp = cv2.addWeighted(gray, 1.8, blurred, -0.8, 0)
    return cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(sharp)


def detect_markers(gray: np.ndarray) -> tuple[list[RawMarker], list[RawMarker]]:
    """Return (plausible markers, discarded slivers) in a stable order.

    A second pass on a sharpened image runs only when a corner fiducial is missing; its markers are
    merged when they do not duplicate a first-pass detection (same id within 12 px).
    """
    height, width = gray.shape[:2]
    scale = 1.0
    work = gray
    longest = max(height, width)
    if longest > config.DETECTION_MAX_SIDE_PX:
        scale = config.DETECTION_MAX_SIDE_PX / longest
        work = cv2.resize(gray, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA)
    markers = _run_detector(work, scale)
    if {m.marker_id for m in markers}.issuperset(FIDUCIAL_IDS) is False:
        for extra in _run_detector(_sharpened(work), scale):
            duplicate = any(
                m.marker_id == extra.marker_id and np.linalg.norm(m.center - extra.center) < 12 for m in markers
            )
            if not duplicate:
                markers.append(extra)
    # Stable order independent of detectMarkers() internals.
    markers.sort(key=lambda m: (m.marker_id, round(float(m.center[1]), 1), round(float(m.center[0]), 1)))
    plausible = [m for m in markers if _plausible_quad(m.corners, IMAGE_MAX_SIDE_RATIO)]
    discarded = [m for m in markers if not _plausible_quad(m.corners, IMAGE_MAX_SIDE_RATIO)]
    return plausible, discarded


def _diag(
    code: str,
    severity: str,
    message: str,
    *,
    marker_ids: list[int] | None = None,
    cells: list[dict] | None = None,
    suggestion: str | None = None,
) -> dict:
    diagnostic: dict = {"code": code, "severity": severity, "stage": "vision", "message": message}
    if marker_ids:
        diagnostic["markerIds"] = sorted(set(marker_ids))
    if cells:
        diagnostic["cells"] = cells
    if suggestion:
        diagnostic["suggestion"] = suggestion
    return diagnostic


def _shoelace(points: np.ndarray) -> float:
    x, y = points[:, 0], points[:, 1]
    return float(0.5 * (np.dot(x, np.roll(y, -1)) - np.dot(np.roll(x, -1), y)))


def _is_convex(points: np.ndarray) -> bool:
    signs = []
    for i in range(len(points)):
        a, b, c = points[i], points[(i + 1) % len(points)], points[(i + 2) % len(points)]
        cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
        signs.append(cross > 0)
    return all(signs) or not any(signs)


def _transform(points: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    return cv2.perspectiveTransform(points.reshape(-1, 1, 2).astype(np.float64), matrix).reshape(-1, 2)


def calibrate(
    fiducials: dict[int, RawMarker], template: BoardTemplate, image_area: float
) -> tuple[np.ndarray | None, float | None, str | None]:
    """Homography image → board mm from the 16 fiducial corners. Returns (H, rms_mm, problem)."""
    centers = np.array([fiducials[fid].center for fid in FIDUCIAL_IDS])
    area = _shoelace(centers)
    if area <= 0:
        return None, None, "Las esquinas aparecen en orden invertido (¿imagen espejada?)."
    if not _is_convex(centers):
        return None, None, "Las cuatro esquinas no forman un cuadrilátero convexo."
    if area < 0.01 * image_area:
        return None, None, "El tablero ocupa una superficie demasiado pequeña de la imagen."
    src = np.vstack([fiducials[fid].corners for fid in FIDUCIAL_IDS])
    dst = np.vstack([template.fiducial(fid).corners_mm() for fid in FIDUCIAL_IDS])
    matrix, _mask = cv2.findHomography(src, dst, 0)
    if matrix is None or not np.all(np.isfinite(matrix)) or abs(matrix[2, 2]) < 1e-12:
        return None, None, "No se pudo calcular la homografía."
    matrix = matrix / matrix[2, 2]
    if abs(np.linalg.det(matrix)) < 1e-15 or np.linalg.cond(matrix) > 1e12:
        return None, None, "La homografía es degenerada."
    projected = _transform(src, matrix)
    rms = float(np.sqrt(np.mean(np.sum((projected - dst) ** 2, axis=1))))
    if rms > template.max_reprojection_mm:
        return None, rms, f"Error de reproyección de {rms:.1f} mm (máximo {template.max_reprojection_mm:.1f} mm)."
    return matrix, rms, None


def _marker_geometry(corners_mm: np.ndarray, template: BoardTemplate) -> dict:
    c0, c1, c2, c3 = corners_mm
    x_axis = ((c1 - c0) + (c2 - c3)) / 2.0
    y_axis = ((c3 - c0) + (c2 - c1)) / 2.0
    angle = math.degrees(math.atan2(x_axis[1], x_axis[0]))
    nearest = round(angle / 90.0)
    deviation = abs(angle - nearest * 90.0)
    orientation = ORIENTATION_BY_QUADRANT[nearest % 4]
    sides = [float(np.linalg.norm(corners_mm[(i + 1) % 4] - corners_mm[i])) for i in range(4)]
    side = float(np.mean(sides))
    u = x_axis / (np.linalg.norm(x_axis) or 1.0)
    v = y_axis / (np.linalg.norm(y_axis) or 1.0)
    marker_center = corners_mm.mean(axis=0)
    # Card centre = marker centre + (card centre - marker centre) expressed in the marker axes.
    offset_x = template.card_width / 2 - template.card_marker_center[0]
    offset_y = template.card_height / 2 - template.card_marker_center[1]
    card_center = marker_center + offset_x * u + offset_y * v
    half_w, half_h = template.card_width / 2, template.card_height / 2
    card_outline = np.array(
        [
            card_center - half_w * u - half_h * v,
            card_center + half_w * u - half_h * v,
            card_center + half_w * u + half_h * v,
            card_center - half_w * u + half_h * v,
        ]
    )
    return {
        "angle": angle,
        "deviation": deviation,
        "orientation": orientation,
        "side": side,
        "card_center": card_center,
        "card_outline": card_outline,
        "u": u,
    }


def _cell_neighbors(row: int, col: int, dx: float, dy: float, template: BoardTemplate) -> list[dict]:
    cells = [{"row": row, "col": col}]
    if abs(dx) > template.tol_axis:
        ncol = col + (1 if dx > 0 else -1)
        if 0 <= ncol < template.columns:
            cells.append({"row": row, "col": ncol})
    if abs(dy) > template.tol_axis:
        nrow = row + (1 if dy > 0 else -1)
        if 0 <= nrow < template.rows:
            cells.append({"row": nrow, "col": col})
    return cells


def analyze_image(
    image_bgr: np.ndarray,
    *,
    request_id: str | None = None,
    source_mode: str = "image",
    decode_ms: float = 0.0,
    render: bool = True,
) -> dict:
    """Run the full pipeline on decoded pixels and return a DetectionResult dict."""
    started = time.perf_counter()
    request_id = request_id or new_request_id()
    template = load_template()
    catalog = load_catalog()
    height, width = image_bgr.shape[:2]
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    t0 = time.perf_counter()
    markers, slivers = detect_markers(gray)
    detect_ms = (time.perf_counter() - t0) * 1000

    diagnostics: list[dict] = []
    cards: list[dict] = []
    rejected: list[dict] = []
    shapes: list[OverlayShape] = []
    board = {
        "templateId": template.template_id,
        "columns": template.columns,
        "rows": template.rows,
        "calibrated": False,
        "fiducialsFound": [],
        "fiducialsMissing": list(FIDUCIAL_IDS),
        "reprojectionErrorMm": None,
        "homography": None,
    }

    raw_count = len(markers) + len(slivers)
    if raw_count > config.MAX_MARKERS:
        diagnostics.append(
            _diag(
                "TOO_MANY_MARKERS",
                "error",
                f"Se detectaron {raw_count} marcadores (máximo {config.MAX_MARKERS}). La imagen no se procesa.",
                suggestion="Fotografía solo un tablero RitualOS.",
            )
        )
        markers = []
        slivers = []
    elif not markers:
        diagnostics.append(
            _diag(
                "NO_MARKERS_FOUND",
                "error",
                "No se encontró ningún marcador ArUco en la imagen.",
                suggestion="Encuadra todo el tablero con buena luz, sin reflejos, y vuelve a capturar.",
            )
        )

    t1 = time.perf_counter()
    groups: dict[int, list[RawMarker]] = {fid: [m for m in markers if m.marker_id == fid] for fid in FIDUCIAL_IDS}
    found = [fid for fid in FIDUCIAL_IDS if groups[fid]]
    missing = [fid for fid in FIDUCIAL_IDS if not groups[fid]]
    duplicated = [fid for fid in FIDUCIAL_IDS if len(groups[fid]) > 1]
    board["fiducialsFound"] = found
    board["fiducialsMissing"] = missing
    for fid in found:
        for marker in groups[fid]:
            shapes.append(OverlayShape(marker.corners, COLOR_FIDUCIAL, 3, True, f"F{fid}", tuple(marker.corners[0])))

    homography: np.ndarray | None = None
    blocking_code: str | None = None
    if markers and duplicated:
        blocking_code = "DUPLICATE_FIDUCIAL"
        diagnostics.append(
            _diag(
                "DUPLICATE_FIDUCIAL",
                "error",
                "Hay más de un marcador de esquina con el mismo ID: " + ", ".join(str(f) for f in duplicated) + ".",
                marker_ids=duplicated,
                suggestion="Usa un único tablero impreso en la foto.",
            )
        )
    elif markers and missing:
        blocking_code = "BOARD_FIDUCIAL_MISSING"
        names = ", ".join(f"{fid} ({CORNER_NAMES_ES[fid]})" for fid in missing)
        diagnostics.append(
            _diag(
                "BOARD_FIDUCIAL_MISSING",
                "error",
                f"No se ven los marcadores de esquina {names}. Sin las 4 esquinas no se puede calibrar la perspectiva.",
                marker_ids=missing,
                suggestion=(
                    "Asegúrate de que las cuatro esquinas del tablero (ID 0–3) se vean completas, "
                    "sin sombras ni reflejos."
                ),
            )
        )
    elif markers:
        homography, rms, problem = calibrate(
            {fid: groups[fid][0] for fid in FIDUCIAL_IDS}, template, float(width * height)
        )
        if problem is not None or homography is None:
            blocking_code = "HOMOGRAPHY_DEGENERATE"
            diagnostics.append(
                _diag(
                    "HOMOGRAPHY_DEGENERATE",
                    "error",
                    f"No se pudo calibrar el tablero: {problem}",
                    suggestion="Fotografía el tablero completo, plano y desde un ángulo más frontal.",
                )
            )
            homography = None
        else:
            board["calibrated"] = True
            board["reprojectionErrorMm"] = round(float(rms or 0.0), 4)
            board["homography"] = [float(v) for v in homography.ravel()]
    calibrate_ms = (time.perf_counter() - t1) * 1000

    t2 = time.perf_counter()
    inverse = np.linalg.inv(homography) if homography is not None else None
    if inverse is not None:
        for col in range(template.columns + 1):
            x = template.grid_x + col * template.cell_width
            line = np.array([[x, template.grid_y], [x, template.grid_y + template.grid_height]])
            shapes.append(OverlayShape(_transform(line, inverse), COLOR_GRID, 1, False, None, None))
        for row in range(template.rows + 1):
            y = template.grid_y + row * template.cell_height
            line = np.array([[template.grid_x, y], [template.grid_x + template.grid_width, y]])
            shapes.append(OverlayShape(_transform(line, inverse), COLOR_GRID, 1, False, None, None))

    for marker in (m for m in markers if m.marker_id not in FIDUCIAL_IDS):
        entry: CatalogEntry | None = catalog.get(marker.marker_id)
        corners_list = [[round(float(x), 2), round(float(y), 2)] for x, y in marker.corners]
        center_image = {"x": round(float(marker.center[0]), 2), "y": round(float(marker.center[1]), 2)}

        def reject(
            reason: str,
            center_mm: dict | None,
            candidates: list[dict],
            label: str,
            *,
            _m: RawMarker = marker,
            _center: dict = center_image,
            _corners: list = corners_list,
        ) -> None:
            rejected.append(
                {
                    "markerId": _m.marker_id,
                    "reason": reason,
                    "centerImage": _center,
                    "centerMm": center_mm,
                    "candidateCells": candidates,
                    "cornersImage": _corners,
                }
            )
            shapes.append(OverlayShape(_m.corners, COLOR_ERROR, 3, True, label, tuple(_m.corners[0])))

        if entry is None or not entry.enabled:
            diagnostics.append(
                _diag(
                    "UNKNOWN_CARD",
                    "error",
                    f"El marcador #{marker.marker_id} no pertenece al catálogo cards-v1.",
                    marker_ids=[marker.marker_id],
                    suggestion="Retira esa tarjeta o usa una impresa con el kit oficial (IDs 10–35).",
                )
            )
            center_mm = None
            if homography is not None:
                c = _transform(marker.corners, homography).mean(axis=0)
                center_mm = {"x": round(float(c[0]), 2), "y": round(float(c[1]), 2)}
            reject("UNKNOWN_CARD", center_mm, [], f"#{marker.marker_id} desconocida")
            continue

        if homography is None or inverse is None:
            reject(blocking_code or "BOARD_FIDUCIAL_MISSING", None, [], f"#{marker.marker_id} sin calibrar")
            continue

        corners_mm = _transform(marker.corners, homography)
        if not _plausible_quad(corners_mm, BOARD_MAX_SIDE_RATIO):
            diagnostics.append(
                _diag(
                    "MARKER_SIZE_MISMATCH",
                    "info",
                    f"Se descartó una detección no cuadrada del marcador #{marker.marker_id} "
                    "(probable falso positivo).",
                    marker_ids=[marker.marker_id],
                )
            )
            reject("MARKER_SIZE_MISMATCH", None, [], f"#{marker.marker_id} descartado")
            continue
        geometry = _marker_geometry(corners_mm, template)
        cx, cy = (float(v) for v in geometry["card_center"])
        center_mm = {"x": round(cx, 2), "y": round(cy, 2)}
        col_f = (cx - template.grid_x) / template.cell_width
        row_f = (cy - template.grid_y) / template.cell_height
        label_base = f"#{marker.marker_id} {entry.kind}"

        if not (0 <= col_f < template.columns and 0 <= row_f < template.rows):
            near_row = min(max(int(math.floor(row_f)), 0), template.rows - 1)
            near_col = min(max(int(math.floor(col_f)), 0), template.columns - 1)
            diagnostics.append(
                _diag(
                    "CARD_NOT_IN_CELL",
                    "error",
                    f"La tarjeta #{marker.marker_id} ({entry.kind}) está fuera de la cuadrícula.",
                    marker_ids=[marker.marker_id],
                    cells=[{"row": near_row, "col": near_col}],
                    suggestion="Colócala completamente dentro de una casilla del tablero.",
                )
            )
            reject("CARD_NOT_IN_CELL", center_mm, [{"row": near_row, "col": near_col}], f"{label_base} fuera")
            continue

        col = int(math.floor(col_f))
        row = int(math.floor(row_f))
        dx = col_f - (col + 0.5)
        dy = row_f - (row + 0.5)
        if abs(dx) > template.tol_axis or abs(dy) > template.tol_axis:
            candidates = _cell_neighbors(row, col, dx, dy, template)
            listed = " y ".join(f"({c['row']},{c['col']})" for c in candidates)
            diagnostics.append(
                _diag(
                    "AMBIGUOUS_POSITION",
                    "error",
                    f"La tarjeta #{marker.marker_id} ({entry.kind}) está entre las casillas {listed}.",
                    marker_ids=[marker.marker_id],
                    cells=candidates,
                    suggestion="Céntrala dentro de una sola casilla y vuelve a capturar.",
                )
            )
            reject("AMBIGUOUS_POSITION", center_mm, candidates, f"{label_base} entre casillas")
            continue

        if geometry["deviation"] > template.tol_orientation_deg:
            angle = geometry["angle"]
            lower = ORIENTATION_BY_QUADRANT[math.floor(angle / 90.0) % 4]
            upper = ORIENTATION_BY_QUADRANT[math.ceil(angle / 90.0) % 4]
            diagnostics.append(
                _diag(
                    "AMBIGUOUS_ORIENTATION",
                    "error",
                    (
                        f"La tarjeta #{marker.marker_id} ({entry.kind}) en ({row},{col}) está girada "
                        f"{geometry['deviation']:.0f}° respecto a un eje: no se distingue si apunta al "
                        f"{ORIENTATION_NAMES_ES[lower]} o al {ORIENTATION_NAMES_ES[upper]}."
                    ),
                    marker_ids=[marker.marker_id],
                    cells=[{"row": row, "col": col}],
                    suggestion="Gírala para que su flecha quede paralela a los bordes del tablero.",
                )
            )
            reject("AMBIGUOUS_ORIENTATION", center_mm, [{"row": row, "col": col}], f"{label_base} girada")
            continue

        relative_size = abs(geometry["side"] - template.card_marker_size) / template.card_marker_size
        color = COLOR_OK
        if relative_size > template.tol_marker_size:
            color = COLOR_WARN
            diagnostics.append(
                _diag(
                    "MARKER_SIZE_MISMATCH",
                    "warning",
                    (
                        f"El marcador #{marker.marker_id} mide {geometry['side']:.1f} mm; se esperaban "
                        f"{template.card_marker_size:.0f} mm. ¿Mezclaste tarjetas reducidas y tablero A3?"
                    ),
                    marker_ids=[marker.marker_id],
                    cells=[{"row": row, "col": col}],
                    suggestion="Imprime tablero y tarjetas a la misma escala.",
                )
            )
        position_score = 1.0 - min(max(abs(dx), abs(dy)) / 0.5, 1.0)
        angle_score = 1.0 - min(geometry["deviation"] / 45.0, 1.0)
        size_score = 1.0 - min(relative_size, 1.0)
        quality = round(max(0.0, min(position_score, angle_score, size_score)), 3)
        canonical = template.to_canonical(cx, cy)
        cards.append(
            {
                "markerId": marker.marker_id,
                "row": row,
                "col": col,
                "orientation": geometry["orientation"],
                "quality": quality,
                "cardInstanceId": entry.card_instance_id,
                "type": entry.kind,
                "centerMm": center_mm,
                "centerCanonical": {"x": round(canonical[0], 2), "y": round(canonical[1], 2)},
                "offset": {"dx": round(dx, 4), "dy": round(dy, 4)},
                "angleDeg": round(geometry["angle"], 3),
                "angleDeviationDeg": round(geometry["deviation"], 3),
                "sideMm": round(geometry["side"], 3),
                "cornersImage": corners_list,
            }
        )
        outline = _transform(geometry["card_outline"], inverse)
        tip_mm = geometry["card_center"] + geometry["u"] * (template.cell_width * 0.42)
        arrow = _transform(np.array([geometry["card_center"], tip_mm]), inverse)
        label = f"#{marker.marker_id} {row},{col} {geometry['orientation']}"
        shapes.append(OverlayShape(outline, color, 2, True, None, None))
        shapes.append(
            OverlayShape(marker.corners, color, 2, True, label, tuple(outline[0]), (tuple(arrow[0]), tuple(arrow[1])))
        )

    cards.sort(key=lambda c: (c["row"], c["col"], c["markerId"]))
    for sliver in slivers:
        rejected.append(
            {
                "markerId": sliver.marker_id,
                "reason": "MARKER_SIZE_MISMATCH",
                "centerImage": {"x": round(float(sliver.center[0]), 2), "y": round(float(sliver.center[1]), 2)},
                "centerMm": None,
                "candidateCells": [],
                "cornersImage": [[round(float(x), 2), round(float(y), 2)] for x, y in sliver.corners],
            }
        )
        diagnostics.append(
            _diag(
                "MARKER_SIZE_MISMATCH",
                "info",
                f"Se descartó una detección deformada del marcador #{sliver.marker_id} (probable falso positivo).",
                marker_ids=[sliver.marker_id],
            )
        )
    rejected.sort(key=lambda r: (r["markerId"], r["centerImage"]["y"], r["centerImage"]["x"]))
    diagnostics.sort(
        key=lambda d: (SEVERITY_ORDER[d["severity"]], d["code"], (d.get("markerIds") or [-1])[0], d["message"])
    )
    assign_ms = (time.perf_counter() - t2) * 1000

    t3 = time.perf_counter()
    overlay = None
    if render:
        errors = sum(1 for d in diagnostics if d["severity"] == "error")
        status = "calibrado" if board["calibrated"] else "SIN CALIBRAR"
        header = f"RitualOS vision | {len(cards)} tarjetas | {status} | errores: {errors}"
        if missing and markers:
            header += " | faltan esquinas: " + ",".join(str(f) for f in missing)
        jpeg, overlay_w, overlay_h = render_overlay(image_bgr, shapes, header)
        overlay = {"mime": "image/jpeg", "width": overlay_w, "height": overlay_h, "dataBase64": jpeg}
    overlay_ms = (time.perf_counter() - t3) * 1000
    total_ms = (time.perf_counter() - started) * 1000 + decode_ms

    return {
        "protocolVersion": "ritual-board/1",
        "requestId": request_id,
        "detectorVersion": DETECTOR_VERSION,
        "sourceMode": source_mode,
        "image": {"width": int(width), "height": int(height)},
        "board": board,
        "cards": cards,
        "rejectedMarkers": rejected,
        "diagnostics": diagnostics,
        "metrics": {
            "decodeMs": round(decode_ms, 3),
            "detectMs": round(detect_ms, 3),
            "calibrateMs": round(calibrate_ms, 3),
            "assignMs": round(assign_ms, 3),
            "overlayMs": round(overlay_ms, 3),
            "totalMs": round(total_ms, 3),
            "markersDetected": raw_count,
        },
        "overlay": overlay,
    }
