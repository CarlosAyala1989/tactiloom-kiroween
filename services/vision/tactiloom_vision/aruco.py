"""ArUco dictionary and detector construction (OpenCV objdetect API)."""

from __future__ import annotations

from functools import lru_cache

import cv2
import numpy as np

DICTIONARY_NAME = "DICT_4X4_100"
MARKER_BITS = 4
BORDER_BITS = 1
MODULES = MARKER_BITS + 2 * BORDER_BITS  # 6x6 modules including the black border


@lru_cache(maxsize=1)
def get_dictionary() -> cv2.aruco.Dictionary:
    return cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_100)


def marker_modules(marker_id: int) -> np.ndarray:
    """Return the 6x6 module matrix of a marker (1 = white, 0 = black)."""
    image = cv2.aruco.generateImageMarker(get_dictionary(), marker_id, MODULES, borderBits=BORDER_BITS)
    return (image > 127).astype(np.uint8)


def render_marker(marker_id: int, side_px: int) -> np.ndarray:
    """Render a marker (with its black border, without quiet zone) as a grayscale image."""
    modules = marker_modules(marker_id)
    image = cv2.resize(modules * 255, (side_px, side_px), interpolation=cv2.INTER_NEAREST)
    return image.astype(np.uint8)


def export_dictionary() -> dict:
    count = get_dictionary().bytesList.shape[0]
    return {
        "dictionary": DICTIONARY_NAME,
        "markerBits": MARKER_BITS,
        "borderBits": BORDER_BITS,
        "modules": MODULES,
        "encoding": "rows of '1' (white) / '0' (black), top row first, marker upright",
        "source": f"OpenCV {cv2.__version__} cv2.aruco.generateImageMarker",
        "markers": {
            str(marker_id): ["".join(str(int(v)) for v in row) for row in marker_modules(marker_id)]
            for marker_id in range(count)
        },
    }


def create_detector() -> cv2.aruco.ArucoDetector:
    """Detector with documented parameters (see docs/physical-grammar-v1.md §Visión)."""
    params = cv2.aruco.DetectorParameters()
    params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
    params.cornerRefinementWinSize = 5
    params.cornerRefinementMaxIterations = 50
    params.adaptiveThreshWinSizeMin = 5
    params.adaptiveThreshWinSizeMax = 45
    params.adaptiveThreshWinSizeStep = 8
    params.minMarkerPerimeterRate = 0.02
    params.maxMarkerPerimeterRate = 4.0
    params.polygonalApproxAccuracyRate = 0.04
    params.errorCorrectionRate = 0.5
    return cv2.aruco.ArucoDetector(get_dictionary(), params)
