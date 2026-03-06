"""Shared fixtures for the test suite."""

from __future__ import annotations

import base64
from typing import Any
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.detection_service import DetectionService


# ---------------------------------------------------------------------------
# Fake detection service — avoids loading YOLO / ffmpeg / yt-dlp in tests
# ---------------------------------------------------------------------------

MOCK_DETECTIONS: list[dict[str, float]] = [
    {"timestamp": 8.4, "confidence": 0.92},
    {"timestamp": 9.1, "confidence": 0.88},
    {"timestamp": 38.6, "confidence": 0.94},
    {"timestamp": 39.3, "confidence": 0.96},
    {"timestamp": 104.0, "confidence": 0.97},
]


class FakeDetectionService(DetectionService):
    """Returns canned detections so tests run without a real model."""

    def detect(self, request: Any) -> list[dict[str, float]]:
        return MOCK_DETECTIONS


def _fake_detection_service() -> FakeDetectionService:
    return FakeDetectionService()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def client() -> TestClient:
    """TestClient with the real pipeline mocked out."""
    from app.services.detection_service import get_detection_service

    app.dependency_overrides[get_detection_service] = _fake_detection_service
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def sample_video_b64() -> str:
    """Tiny valid base64 string (not a real video, but passes schema validation)."""
    return base64.b64encode(b"\x00\x00\x00\x1cftypisom").decode()


# ---------------------------------------------------------------------------
# Client's real test payloads (from conversation)
# ---------------------------------------------------------------------------


@pytest.fixture()
def basketball_payload() -> dict[str, Any]:
    """Basketball test case — camelCase (as Clipt backend would send)."""
    return {
        "videoUrl": "https://www.youtube.com/live/SyXhzqhTuzI?feature=shared",
        "jerseyNumber": 2,
        "jerseyColor": "white",
        "sport": "basketball",
        "position": "guard",
    }


@pytest.fixture()
def football_payload() -> dict[str, Any]:
    """Football test case — camelCase."""
    return {
        "videoUrl": "https://www.youtube.com/live/BMsdbAVOUPM?feature=shared",
        "jerseyNumber": 2,
        "jerseyColor": "blue",
        "sport": "football",
        "position": "quarterback",
    }


@pytest.fixture()
def lacrosse_payload() -> dict[str, Any]:
    """Lacrosse test case — camelCase."""
    return {
        "videoUrl": "https://www.youtube.com/live/8MkNFAbPcwo?feature=shared",
        "jerseyNumber": 26,
        "jerseyColor": "white",
        "sport": "lacrosse",
        "position": "midfielder",
    }


@pytest.fixture()
def snake_case_payload() -> dict[str, Any]:
    """Same basketball case but using snake_case field names."""
    return {
        "video_url": "https://www.youtube.com/live/SyXhzqhTuzI?feature=shared",
        "jersey_number": 2,
        "jersey_color": "white",
        "sport": "basketball",
        "position": "guard",
    }


@pytest.fixture()
def integration_guide_payload() -> dict[str, Any]:
    """Payload matching the integration guide example (no position field)."""
    return {
        "video_url": "https://www.youtube.com/live/SyXhzqhTuzI?feature=shared",
        "jersey_number": 2,
        "jersey_color": "white",
        "sport": "basketball",
    }
