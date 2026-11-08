from __future__ import annotations

import io
import json

import numpy as np
from PIL import Image

from tactiloom_vision import config
from tactiloom_vision.aruco import export_dictionary
from tactiloom_vision.detector import analyze_image
from tactiloom_vision.imaging import decode_image, sniff_format

from .conftest import read_bytes


def test_committed_dictionary_matches_opencv() -> None:
    committed = json.loads((config.REPO_ROOT / "packages/board-kit/src/aruco/dict-4x4-100.json").read_text("utf-8"))
    current = export_dictionary()
    assert committed["markers"] == current["markers"]
    assert committed["modules"] == 6


def test_sniffing() -> None:
    assert sniff_format(b"\xff\xd8\xff\xe0rest") == "JPEG"
    assert sniff_format(b"\x89PNG\r\n\x1a\nrest") == "PNG"
    assert sniff_format(b"RIFF\x00\x00\x00\x00WEBPVP8 ") == "WEBP"
    assert sniff_format(b"GIF89a") is None
    assert sniff_format(b"%PDF-1.7") is None


def test_exif_orientation_is_applied_once() -> None:
    """A phone photo stored sideways with EXIF Orientation=6 must be read as upright."""
    upright = Image.open(io.BytesIO(read_bytes("assets/examples/boards/valid-board.png"))).convert("RGB")
    stored = upright.transpose(Image.Transpose.ROTATE_90)  # what the sensor wrote (counter-clockwise)
    exif = Image.Exif()
    exif[0x0112] = 6  # rotate 90° clockwise to display
    buffer = io.BytesIO()
    stored.save(buffer, format="JPEG", quality=92, exif=exif.tobytes())
    decoded = decode_image(buffer.getvalue())
    assert decoded.shape[1] == upright.width and decoded.shape[0] == upright.height
    result = analyze_image(decoded, request_id="req_exif", render=False)
    assert len(result["cards"]) == 10


def test_webp_and_grayscale_inputs_are_supported() -> None:
    upright = Image.open(io.BytesIO(read_bytes("assets/examples/boards/valid-board.png")))
    for fmt, mode in (("WEBP", "RGB"), ("PNG", "L")):
        buffer = io.BytesIO()
        upright.convert(mode).save(buffer, format=fmt, quality=95)
        decoded = decode_image(buffer.getvalue())
        assert decoded.dtype == np.uint8 and decoded.ndim == 3
        assert len(analyze_image(decoded, request_id="req_fmt", render=False)["cards"]) == 10
