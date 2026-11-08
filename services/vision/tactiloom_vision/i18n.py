"""Overlay texts in the four supported languages (es, en, it, fr).

Diagnostics keep their canonical Spanish ``message`` plus structured ``params``; clients localize
them from ``code`` + ``params``. The overlay is an image, so its texts are rendered here in the
locale requested by the caller. Hershey fonts are ASCII-only: see ``overlay.ascii_text``.
"""

from __future__ import annotations

from dataclasses import dataclass

LOCALES: tuple[str, ...] = ("es", "en", "it", "fr")
DEFAULT_LOCALE = "es"


@dataclass(frozen=True)
class OverlayStrings:
    card_one: str
    card_many: str
    calibrated: str
    not_calibrated: str
    errors: str
    missing_corners: str
    unknown: str
    not_calibrated_card: str
    discarded: str
    outside: str
    between_cells: str
    rotated: str


OVERLAY_STRINGS: dict[str, OverlayStrings] = {
    "es": OverlayStrings(
        card_one="tarjeta",
        card_many="tarjetas",
        calibrated="calibrado",
        not_calibrated="SIN CALIBRAR",
        errors="errores",
        missing_corners="faltan esquinas",
        unknown="desconocida",
        not_calibrated_card="sin calibrar",
        discarded="descartado",
        outside="fuera",
        between_cells="entre casillas",
        rotated="girada",
    ),
    "en": OverlayStrings(
        card_one="card",
        card_many="cards",
        calibrated="calibrated",
        not_calibrated="NOT CALIBRATED",
        errors="errors",
        missing_corners="missing corners",
        unknown="unknown",
        not_calibrated_card="not calibrated",
        discarded="discarded",
        outside="outside",
        between_cells="between cells",
        rotated="rotated",
    ),
    "it": OverlayStrings(
        card_one="carta",
        card_many="carte",
        calibrated="calibrato",
        not_calibrated="NON CALIBRATO",
        errors="errori",
        missing_corners="angoli mancanti",
        unknown="sconosciuta",
        not_calibrated_card="non calibrata",
        discarded="scartato",
        outside="fuori",
        between_cells="tra due caselle",
        rotated="ruotata",
    ),
    "fr": OverlayStrings(
        card_one="carte",
        card_many="cartes",
        calibrated="calibré",
        not_calibrated="NON CALIBRÉ",
        errors="erreurs",
        missing_corners="coins manquants",
        unknown="inconnue",
        not_calibrated_card="non calibrée",
        discarded="écarté",
        outside="hors grille",
        between_cells="entre deux cases",
        rotated="tournée",
    ),
}


def overlay_strings(locale: str) -> OverlayStrings:
    """Strings for a supported locale; unknown values fall back to Spanish (the API rejects them first)."""
    return OVERLAY_STRINGS.get(locale, OVERLAY_STRINGS[DEFAULT_LOCALE])


def overlay_header(locale: str, cards: int, calibrated: bool, errors: int, missing: list[int]) -> str:
    s = overlay_strings(locale)
    noun = s.card_one if cards == 1 else s.card_many
    status = s.calibrated if calibrated else s.not_calibrated
    header = f"Tactiloom vision | {cards} {noun} | {status} | {s.errors}: {errors}"
    if missing:
        header += f" | {s.missing_corners}: " + ",".join(str(fid) for fid in missing)
    return header
