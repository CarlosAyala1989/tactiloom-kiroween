# syntax=docker/dockerfile:1.7
# Vision service (FastAPI + OpenCV headless). Build context: repository root.
FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    RITUALOS_CATALOG_DIR=/app/contracts/catalog RITUALOS_SCHEMAS_DIR=/app/contracts/schemas
WORKDIR /app
COPY services/vision/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY packages/contracts/catalog ./contracts/catalog
COPY packages/contracts/schemas ./contracts/schemas
COPY services/vision/ritualos_vision ./ritualos_vision
RUN useradd --system --uid 10001 --no-create-home vision
USER vision
EXPOSE 8000
CMD ["uvicorn", "ritualos_vision.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-server-header"]
