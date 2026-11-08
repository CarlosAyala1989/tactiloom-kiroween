"""HTTP API: success path, limits and safe error envelopes."""

from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from ritualos_vision import app as app_module
from ritualos_vision import config

from .conftest import read_bytes

client = TestClient(app_module.app)


def post_image(data: bytes, filename: str = "board.png", content_type: str = "image/png", **extra):
    return client.post("/v1/analyze", files={"image": (filename, data, content_type)}, **extra)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok" and body["dictionary"] == "DICT_4X4_100"


def test_analyze_valid_board() -> None:
    response = post_image(read_bytes("assets/examples/boards/valid-board.png"), headers={"x-request-id": "req_abc"})
    assert response.status_code == 200
    body = response.json()
    assert body["requestId"] == "req_abc"
    assert body["sourceMode"] == "image"
    assert len(body["cards"]) == 10
    assert response.headers["x-request-id"] == "req_abc"


def test_rejects_untrusted_request_id() -> None:
    response = post_image(read_bytes("assets/examples/boards/valid-board.png"), headers={"x-request-id": "../../etc"})
    assert response.status_code == 200
    assert response.json()["requestId"].startswith("req_")


def test_source_mode_physical_and_invalid() -> None:
    data = read_bytes("assets/examples/boards/valid-board.png")
    ok = client.post("/v1/analyze", files={"image": ("b.png", data, "image/png")}, data={"sourceMode": "physical"})
    assert ok.json()["sourceMode"] == "physical"
    bad = client.post("/v1/analyze", files={"image": ("b.png", data, "image/png")}, data={"sourceMode": "simulator"})
    assert bad.status_code == 400


def test_corrupt_png_is_422() -> None:
    response = post_image(read_bytes("tests/fixtures/boards/corrupt-image.png"))
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMAGE_CORRUPT"


def test_pdf_disguised_as_png_is_415() -> None:
    response = post_image(b"%PDF-1.7\n%fake\n", filename="board.png")
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "UNSUPPORTED_IMAGE_TYPE"


def test_empty_upload_is_400() -> None:
    response = post_image(b"")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "IMAGE_EMPTY"


def test_missing_file_field_is_400() -> None:
    response = client.post("/v1/analyze", data={"sourceMode": "image"})
    assert response.status_code == 400
    assert set(response.json()["error"]) == {"code", "message", "requestId"}


def test_tiny_image_is_422() -> None:
    buffer = io.BytesIO()
    Image.new("RGB", (64, 64), "white").save(buffer, format="PNG")
    response = post_image(buffer.getvalue())
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMAGE_TOO_SMALL"


def test_body_over_limit_is_413(monkeypatch: pytest.MonkeyPatch) -> None:
    oversized = b"\x89PNG\r\n\x1a\n" + b"0" * (config.MAX_UPLOAD_BYTES + 128 * 1024)
    response = post_image(oversized)
    assert response.status_code == 413


def test_decompression_bomb_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config, "MAX_PIXELS", 1_000_000)
    buffer = io.BytesIO()
    Image.new("L", (2000, 2000), 255).save(buffer, format="PNG")
    response = post_image(buffer.getvalue())
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "IMAGE_TOO_LARGE"


def test_internal_token_enforced(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config, "INTERNAL_TOKEN", "s3cret-token")
    data = read_bytes("assets/examples/boards/valid-board.png")
    assert post_image(data).status_code == 401
    assert post_image(data, headers={"x-internal-token": "wrong"}).status_code == 401
    assert post_image(data, headers={"x-internal-token": "s3cret-token"}).status_code == 200
    assert client.get("/health").status_code == 200  # liveness stays open on the private network


def test_bad_token_is_rejected_before_the_body_is_read(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config, "INTERNAL_TOKEN", "s3cret-token")
    # A malformed multipart body would be a 400 if parsed; the token check must answer first.
    response = client.post(
        "/v1/analyze", content=b"--x\r\nnot multipart", headers={"content-type": "multipart/form-data; boundary=x"}
    )
    assert response.status_code == 401


def test_busy_service_answers_503(monkeypatch: pytest.MonkeyPatch) -> None:
    import asyncio

    monkeypatch.setattr(config, "QUEUE_TIMEOUT_S", 0)
    monkeypatch.setattr(app_module, "_semaphore", asyncio.Semaphore(0))
    response = post_image(read_bytes("assets/examples/boards/valid-board.png"))
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "VISION_BUSY"
