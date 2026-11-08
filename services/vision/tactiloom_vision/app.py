"""FastAPI service: POST /v1/analyze (image bytes → DetectionResult). Never executes workflows."""

from __future__ import annotations

import asyncio
import hmac
import json
import logging
import re
import sys
import time
from typing import Annotated

import cv2
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from . import DETECTOR_VERSION, config
from .detector import analyze_image, new_request_id
from .imaging import ImageRejectedError, decode_image
from .models import DetectionResult

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
MULTIPART_OVERHEAD = 64 * 1024

logger = logging.getLogger("tactiloom.vision")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


def log_event(**fields: object) -> None:
    logger.info(json.dumps({"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "service": "vision", **fields}))


def error_response(status: int, code: str, message: str, request_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "requestId": request_id}},
        headers={"x-request-id": request_id},
    )


class _BodyTooLargeError(Exception):
    pass


class BodySizeLimitMiddleware:
    """Rejects bodies larger than the configured limit, even without Content-Length (chunked)."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = dict(scope.get("headers") or [])
        # Authenticate BEFORE any body is read or multipart-parsed.
        if config.INTERNAL_TOKEN is not None and scope.get("path") != "/health":
            provided = headers.get(b"x-internal-token", b"")
            if not hmac.compare_digest(provided, config.INTERNAL_TOKEN.encode()):
                await error_response(401, "UNAUTHORIZED", "Token interno inválido.", new_request_id())(
                    scope, receive, send
                )
                return
        declared = headers.get(b"content-length")
        if declared is not None:
            try:
                too_large = int(declared) > self.max_bytes
            except ValueError:
                await error_response(400, "BAD_REQUEST", "Content-Length inválido.", new_request_id())(
                    scope, receive, send
                )
                return
            if too_large:
                await error_response(413, "IMAGE_TOO_LARGE", "La petición es demasiado grande.", new_request_id())(
                    scope, receive, send
                )
                return
        received = 0
        started = False

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise _BodyTooLargeError
            return message

        async def tracking_send(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracking_send)
        except _BodyTooLargeError:
            if not started:
                await error_response(413, "IMAGE_TOO_LARGE", "La petición es demasiado grande.", new_request_id())(
                    scope, receive, send
                )


app = FastAPI(
    title="Tactiloom Vision",
    version=DETECTOR_VERSION,
    description="ArUco board reading for Tactiloom (internal service).",
)
app.add_middleware(BodySizeLimitMiddleware, max_bytes=config.MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD)
_semaphore = asyncio.Semaphore(config.MAX_CONCURRENT_ANALYSES)


def _request_id(request: Request) -> str:
    candidate = request.headers.get("x-request-id", "")
    return candidate if REQUEST_ID_PATTERN.match(candidate) else new_request_id()


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response(
        400, "BAD_REQUEST", "Petición inválida: se requiere el campo de archivo 'image'.", _request_id(request)
    )


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "tactiloom-vision",
        "detectorVersion": DETECTOR_VERSION,
        "opencv": cv2.__version__,
        "dictionary": "DICT_4X4_100",
    }


@app.post("/v1/analyze")
async def analyze(
    request: Request,
    image: Annotated[UploadFile, File()],
    sourceMode: Annotated[str, Form()] = "image",  # noqa: N803 - contract field name
) -> JSONResponse:
    request_id = _request_id(request)
    started = time.perf_counter()
    if config.INTERNAL_TOKEN is not None:
        provided = request.headers.get("x-internal-token", "")
        if not hmac.compare_digest(provided.encode(), config.INTERNAL_TOKEN.encode()):
            return error_response(401, "UNAUTHORIZED", "Token interno inválido.", request_id)
    if sourceMode not in ("physical", "image"):
        return error_response(400, "BAD_REQUEST", "sourceMode debe ser 'physical' o 'image'.", request_id)
    data = await image.read(config.MAX_UPLOAD_BYTES + 1)
    await image.close()
    try:
        await asyncio.wait_for(_semaphore.acquire(), timeout=config.QUEUE_TIMEOUT_S)
    except TimeoutError:
        log_event(event="analyze.busy", requestId=request_id)
        return error_response(503, "VISION_BUSY", "El servicio de visión está ocupado; inténtalo de nuevo.", request_id)
    try:
        try:
            t0 = time.perf_counter()
            decoded = await run_in_threadpool(decode_image, data)
            decode_ms = (time.perf_counter() - t0) * 1000
        except ImageRejectedError as rejected:
            log_event(event="analyze.rejected", requestId=request_id, code=rejected.code, bytes=len(data))
            return error_response(rejected.status, rejected.code, rejected.message, request_id)
        result = await run_in_threadpool(
            analyze_image, decoded, request_id=request_id, source_mode=sourceMode, decode_ms=decode_ms
        )
    finally:
        _semaphore.release()
    DetectionResult.model_validate(result)  # contract guard: never emit an invalid payload
    log_event(
        event="analyze.done",
        requestId=request_id,
        ms=round((time.perf_counter() - started) * 1000, 1),
        calibrated=result["board"]["calibrated"],
        cards=len(result["cards"]),
        diagnostics=[d["code"] for d in result["diagnostics"]],
    )
    return JSONResponse(content=result, headers={"x-request-id": request_id})
