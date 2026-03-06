"""Tests for the /health endpoint."""

from __future__ import annotations

from fastapi.testclient import TestClient


class TestHealth:
    def test_health_returns_ok(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_health_post_not_allowed(self, client: TestClient) -> None:
        response = client.post("/health")
        assert response.status_code == 405
