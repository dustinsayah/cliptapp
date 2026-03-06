# POST /detect

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from app.schemas.detect import DetectRequest, DetectionFrame
from app.services.detection_service import DetectionService, get_detection_service

LOGGER = logging.getLogger(__name__)
router = APIRouter()


@router.post("/detect", response_model=list[DetectionFrame])
async def detect(
    detect_request: DetectRequest,
    detection_service: DetectionService = Depends(get_detection_service),
) -> Any:
    try:
        detections = await run_in_threadpool(detection_service.detect, detect_request)
    except Exception:  # pragma: no cover
        LOGGER.exception("Detection request failed")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal detection error. See server logs for details."},
        )
    return JSONResponse(status_code=200, content=detections)
