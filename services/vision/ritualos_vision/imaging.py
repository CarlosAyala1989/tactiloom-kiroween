"""Safe image decoding: signature sniffing, pixel limits and controlled EXIF orientation."""

from __future__ import annotations

import io
import warnings

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from . import config

ALLOWED_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


class ImageRejectedError(Exception):
    """Raised when an upload cannot be processed safely. Maps to an HTTP error."""

    def __init__(self, code: str, message: str, status: int) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def sniff_format(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "JPEG"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "PNG"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "WEBP"
    return None


def decode_image(data: bytes) -> np.ndarray:
    """Decode an untrusted upload into a BGR uint8 image or raise ImageRejectedError."""
    if not data:
        raise ImageRejectedError("IMAGE_EMPTY", "La imagen está vacía.", 400)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise ImageRejectedError(
            "IMAGE_TOO_LARGE",
            f"La imagen supera el máximo de {config.MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            413,
        )
    sniffed = sniff_format(data)
    if sniffed is None:
        raise ImageRejectedError("UNSUPPORTED_IMAGE_TYPE", "Formato no soportado: usa JPG, PNG o WEBP.", 415)

    Image.MAX_IMAGE_PIXELS = config.MAX_PIXELS
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as img:
                if img.format != sniffed or img.format not in ALLOWED_FORMATS:
                    raise ImageRejectedError(
                        "UNSUPPORTED_IMAGE_TYPE", "El contenido no coincide con un JPG/PNG/WEBP válido.", 415
                    )
                width, height = img.size
                if width * height > config.MAX_PIXELS or max(width, height) > config.MAX_SIDE_PX:
                    raise ImageRejectedError("IMAGE_TOO_LARGE", "La imagen tiene demasiados píxeles.", 413)
                if min(width, height) < config.MIN_SIDE_PX:
                    raise ImageRejectedError(
                        "IMAGE_TOO_SMALL",
                        f"La imagen es demasiado pequeña (mínimo {config.MIN_SIDE_PX} px por lado).",
                        422,
                    )
                img.load()
                # Controlled EXIF orientation: apply the camera rotation exactly once, then drop metadata.
                oriented = ImageOps.exif_transpose(img)
                rgb = oriented.convert("RGB")
                array = np.asarray(rgb, dtype=np.uint8)
    except ImageRejectedError:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ImageRejectedError("IMAGE_TOO_LARGE", "La imagen tiene demasiados píxeles.", 413) from exc
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        raise ImageRejectedError("IMAGE_CORRUPT", "No se pudo decodificar la imagen (¿archivo dañado?).", 422) from exc
    return cv2.cvtColor(array, cv2.COLOR_RGB2BGR)
