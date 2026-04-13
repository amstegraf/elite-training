from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.factory import create_app
from app.models import MeshSettings, MissEvent, MissOutcome, MissType, PrecisionSessionStatus
from app.models import PrecisionSession, RackRecord, TableType
from app.services.mesh_url import validate_mesh_base_url
from app.services.mesh_settings_store import (
    load_mesh_settings,
    resolve_mesh_base_url,
    save_mesh_settings,
)
from app.services.pool_coach_payload import (
    build_progress_coach_payload,
    build_session_coach_payload,
)


def test_validate_mesh_base_url_ok() -> None:
    assert validate_mesh_base_url("http://127.0.0.1:8090/") == "http://127.0.0.1:8090"


def test_validate_mesh_base_url_rejects_ftp() -> None:
    with pytest.raises(ValueError):
        validate_mesh_base_url("ftp://x.com")


def test_mesh_settings_roundtrip(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.mesh_settings_store.mesh_settings_path", lambda: tmp_path / "mesh.json")
    save_mesh_settings(MeshSettings.model_validate({"baseUrl": "https://mesh.example:8443"}))
    loaded = load_mesh_settings()
    assert loaded.base_url == "https://mesh.example:8443"


def test_resolve_mesh_base_url_env_overrides_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.services.mesh_settings_store.mesh_settings_path", lambda: tmp_path / "mesh.json")
    save_mesh_settings(MeshSettings.model_validate({"baseUrl": "https://from-file.example"}))
    monkeypatch.setenv("ELITE_MESH_BASE_URL", "https://from-env.example/path/")
    try:
        assert resolve_mesh_base_url() == "https://from-env.example/path"
    finally:
        monkeypatch.delenv("ELITE_MESH_BASE_URL", raising=False)


def _minimal_completed_session() -> PrecisionSession:
    rack = RackRecord(
        rack_number=1,
        ended_at="2024-01-01T12:00:00Z",
        balls_cleared=5,
        misses=[
            MissEvent(
                ball_number=3,
                types=[MissType.POSITION, MissType.SPEED],
                outcome=MissOutcome.POT_MISS,
            )
        ],
    )
    return PrecisionSession(
        program_id="p1",
        plan_id="pl1",
        status=PrecisionSessionStatus.COMPLETED,
        started_at="2024-01-01T10:00:00Z",
        ended_at="2024-01-01T12:00:00Z",
        table_type=TableType.EIGHT_FT,
        total_racks=1,
        racks=[rack],
    )


def test_build_session_coach_payload_shape() -> None:
    s = _minimal_completed_session()
    p = build_session_coach_payload(s)
    assert p["kind"] == "session"
    assert "pot" in p and "position" in p and "conversion" in p
    assert set(p["failure"]) == {"position", "speed", "alignment", "delivery"}
    f = p["failure"]
    assert abs(sum(f.values()) - 1.0) < 0.02 or sum(f.values()) == 0
    assert p["context"]["sessionId"] == s.id


def test_build_progress_coach_payload_empty() -> None:
    p = build_progress_coach_payload([])
    assert p["kind"] == "progress"
    assert p["context"]["sessionCount"] == 0


def test_mesh_health_reachable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.routers.api_ai_coach.resolve_mesh_base_url",
        lambda: "http://mesh.test",
    )

    class Resp:
        status_code = 200

    class AC:
        async def __aenter__(self) -> AC:
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        get = AsyncMock(return_value=Resp())

    monkeypatch.setattr("app.routers.api_ai_coach.httpx.AsyncClient", lambda **kw: AC())
    client = TestClient(create_app())
    r = client.get("/api/ai/mesh-health")
    assert r.status_code == 200
    assert r.json()["reachable"] is True


def test_mesh_health_unreachable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.routers.api_ai_coach.resolve_mesh_base_url",
        lambda: "http://mesh.test",
    )

    class AC:
        async def __aenter__(self) -> AC:
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        get = AsyncMock(side_effect=httpx.ConnectError("nope"))

    monkeypatch.setattr("app.routers.api_ai_coach.httpx.AsyncClient", lambda **kw: AC())
    client = TestClient(create_app())
    r = client.get("/api/ai/mesh-health")
    assert r.status_code == 200
    body = r.json()
    assert body["reachable"] is False


def test_mesh_settings_instruction_override_roundtrip(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.services.mesh_settings_store.mesh_settings_path", lambda: tmp_path / "mesh.json")
    save_mesh_settings(
        MeshSettings(
            base_url="https://mesh.example",
            system_instruction_override="Be brief.",
        )
    )
    loaded = load_mesh_settings()
    assert loaded.system_instruction_override == "Be brief."
    assert loaded.base_url == "https://mesh.example"


def test_mesh_instructions_proxy_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.routers.api_ai_coach.resolve_mesh_base_url",
        lambda: "http://mesh.test",
    )

    class Resp:
        status_code = 200
        text = (
            '{"agent_name":"pool_billiards_coach",'
            '"path":"instructions/local/pool_billiards_coach-instructions.md",'
            '"text":"# Baseline\\n"}'
        )

    class AC:
        async def __aenter__(self) -> AC:
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        get = AsyncMock(return_value=Resp())

    monkeypatch.setattr("app.routers.api_ai_coach.httpx.AsyncClient", lambda **kw: AC())
    client = TestClient(create_app())
    r = client.get("/api/ai/mesh-instructions")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["content"] == "# Baseline\n"


def test_mesh_instructions_plain_text_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    """When mesh returns raw markdown (no JSON), pass through unchanged."""
    monkeypatch.setattr(
        "app.routers.api_ai_coach.resolve_mesh_base_url",
        lambda: "http://mesh.test",
    )

    class Resp:
        status_code = 200
        text = "# Legacy markdown only\n"

    class AC:
        async def __aenter__(self) -> AC:
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        get = AsyncMock(return_value=Resp())

    monkeypatch.setattr("app.routers.api_ai_coach.httpx.AsyncClient", lambda **kw: AC())
    client = TestClient(create_app())
    r = client.get("/api/ai/mesh-instructions")
    assert r.json()["content"] == "# Legacy markdown only\n"

