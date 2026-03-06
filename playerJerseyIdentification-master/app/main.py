# App factory + startup

from __future__ import annotations

import logging
import os

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.routes.detect import router as detect_router
from app.routes.health import router as health_router

LOGGER = logging.getLogger(__name__)


def _configure_logging() -> None:
    root_logger = logging.getLogger()
    if root_logger.handlers:
        return
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )


@asynccontextmanager
async def _lifespan(application: FastAPI):
    """Load models at startup so the first request doesn't wait."""
    _configure_logging()
    try:
        from app.services.detection_detector import get_or_create_detector
        from app.services.detection_runtime import PipelineSettings

        settings = PipelineSettings()
        get_or_create_detector(settings)
        LOGGER.info("YOLO model warmed up at startup")
    except Exception:
        LOGGER.warning("Model warm-up skipped (model file may not be available)")
    yield


def create_app() -> FastAPI:
    _configure_logging()
    application = FastAPI(title="Layer 1 Jersey Detection API", lifespan=_lifespan)
    application.include_router(health_router)
    application.include_router(detect_router)

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        messages = []
        for err in exc.errors():
            loc = " -> ".join(str(p) for p in err.get("loc", []))
            messages.append(f"{loc}: {err.get('msg', 'invalid')}")
        return JSONResponse(
            status_code=400,
            content={"error": "; ".join(messages) if messages else "Validation error"},
        )

    return application


app = create_app()
