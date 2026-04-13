from __future__ import annotations

import json
from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

import app.config as app_config
from app.services.dashboard_reference_session import (
    REFERENCE_SESSION_COOKIE_NAME,
    filter_sessions_since_reference,
)
from app.services.pool_coach_payload import (
    build_progress_coach_payload,
    build_session_coach_payload,
)
from app.services.mesh_settings_store import resolve_mesh_base_url
from app.services.session_service import load_session_for_profile
from app.services.sessions_repo import list_sessions

router = APIRouter(prefix="/api/ai", tags=["ai"])

_MESH_HEALTH_TIMEOUT = 3.0
_MESH_RUN_TIMEOUT = 120.0


class PoolCoachBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    scope: Literal["session", "progress"]
    session_id: str | None = Field(default=None, alias="sessionId")


def _profile_ctx(request: Request) -> tuple[str | None, bool]:
    return (
        getattr(request.state, "active_profile_id", None),
        getattr(request.state, "needs_first_profile", False),
    )


@router.get("/mesh-health")
async def mesh_health() -> dict[str, Any]:
    base = resolve_mesh_base_url()
    url = f"{base.rstrip('/')}/health"
    try:
        async with httpx.AsyncClient(timeout=_MESH_HEALTH_TIMEOUT) as client:
            r = await client.get(url)
    except httpx.TimeoutException:
        return {"reachable": False, "detail": "Mesh host did not respond in time."}
    except httpx.RequestError:
        return {"reachable": False, "detail": "Could not connect to mesh host."}
    reachable = 200 <= r.status_code < 300
    if not reachable:
        return {
            "reachable": False,
            "detail": f"Mesh /health returned HTTP {r.status_code}.",
        }
    return {"reachable": True}


@router.post("/pool-coach")
async def pool_coach(request: Request, body: PoolCoachBody) -> dict[str, Any]:
    active, needs = _profile_ctx(request)
    if needs or not active:
        raise HTTPException(status_code=400, detail="No active player profile.")

    if body.scope == "session":
        if not body.session_id:
            raise HTTPException(status_code=422, detail="sessionId is required for session scope.")
        session = load_session_for_profile(
            body.session_id,
            active_profile_id=active,
            needs_first_profile=needs,
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")
        payload = build_session_coach_payload(session)
    else:
        raw = list_sessions(limit=500, profile_id=active)
        ref = (request.cookies.get(REFERENCE_SESSION_COOKIE_NAME) or "").strip()
        filtered, _ = filter_sessions_since_reference(raw, ref or None)
        payload = build_progress_coach_payload(filtered)

    base = resolve_mesh_base_url()
    run_url = f"{base.rstrip('/')}/run"
    mesh_body: dict[str, Any] = {
        "runtime_name": app_config.POOL_COACH_RUNTIME_NAME,
        "agent_name": app_config.POOL_COACH_AGENT_NAME,
        "user_id": str(active),
        "message": json.dumps(payload, separators=(",", ":"), ensure_ascii=False),
        "session_id": None,
    }
    try:
        async with httpx.AsyncClient(timeout=_MESH_RUN_TIMEOUT) as client:
            r = await client.post(run_url, json=mesh_body)
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=502,
            detail="Mesh host timed out while running the coach.",
        ) from None
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not reach mesh host.",
        ) from exc

    try:
        data = r.json()
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="Mesh host returned a non-JSON response.",
        ) from None

    if r.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=data.get("detail", data.get("message", f"Mesh HTTP {r.status_code}")),
        )

    return {
        "ok": bool(data.get("ok", True)),
        "blocked": bool(data.get("blocked", False)),
        "reason": data.get("reason"),
        "outputText": data.get("output_text") or data.get("outputText"),
        "meshSessionId": data.get("session_id") or data.get("sessionId"),
        "runtimeName": data.get("runtime_name"),
        "framework": data.get("framework"),
    }
