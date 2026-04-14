from __future__ import annotations

import json
from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field

import app.config as app_config
from app.services.dashboard_reference_session import (
    REFERENCE_SESSION_COOKIE_NAME,
    filter_sessions_since_reference,
)
from app.services.pool_coach_cache import (
    has_progress_coach_cache,
    has_session_coach_cache,
    load_progress_coach_cache,
    load_session_coach_cache,
    save_progress_coach_cache,
    save_session_coach_cache,
    storable_to_api_response,
)
from app.services.pool_coach_payload import (
    build_progress_coach_payload,
    build_session_coach_payload,
)
from app.services.mesh_settings_store import load_mesh_settings, resolve_mesh_base_url
from app.services.session_service import load_session_for_profile
from app.services.sessions_repo import list_sessions

router = APIRouter(prefix="/api/ai", tags=["ai"])

_MESH_HEALTH_TIMEOUT = 3.0
_MESH_RUN_TIMEOUT = 120.0
_MESH_INSTRUCTIONS_TIMEOUT = 15.0


class PoolCoachBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    scope: Literal["session", "progress"]
    session_id: str | None = Field(default=None, alias="sessionId")
    regenerate: bool = False


def _profile_ctx(request: Request) -> tuple[str | None, bool]:
    return (
        getattr(request.state, "active_profile_id", None),
        getattr(request.state, "needs_first_profile", False),
    )


def _reference_session_id(request: Request) -> str | None:
    ref = (request.cookies.get(REFERENCE_SESSION_COOKIE_NAME) or "").strip()
    return ref or None


@router.get("/mesh-health")
async def mesh_health(response: Response) -> dict[str, Any]:
    base = resolve_mesh_base_url()
    health_url = f"{base.rstrip('/')}/health"
    instr_url = f"{base.rstrip('/')}/instructions"
    try:
        async with httpx.AsyncClient(timeout=_MESH_HEALTH_TIMEOUT) as client:
            r = await client.get(health_url)
            # Basic contract check: /health must return JSON-ish data from mesh,
            # not just any arbitrary 200 from another local service.
            health_payload = r.json()
            i = await client.get(
                instr_url, params={"agent_name": app_config.POOL_COACH_AGENT_NAME}
            )
    except httpx.TimeoutException:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"reachable": False, "detail": "Mesh host did not respond in time."}
    except httpx.RequestError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"reachable": False, "detail": "Could not connect to mesh host."}
    except (json.JSONDecodeError, TypeError, ValueError):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "reachable": False,
            "detail": "Mesh /health did not return valid JSON.",
        }
    reachable = 200 <= r.status_code < 300
    if not reachable:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "reachable": False,
            "detail": f"Mesh /health returned HTTP {r.status_code}.",
        }
    if not isinstance(health_payload, dict):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"reachable": False, "detail": "Mesh /health JSON shape is invalid."}
    if health_payload.get("ok") is False or health_payload.get("reachable") is False:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "reachable": False,
            "detail": "Mesh /health reports not ready.",
        }
    status_val = str(health_payload.get("status", "")).strip().lower()
    if status_val in {"down", "error", "unhealthy", "not_ready"}:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "reachable": False,
            "detail": f"Mesh /health status={status_val}.",
        }
    if i.status_code != 200:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "reachable": False,
            "detail": f"Mesh /instructions returned HTTP {i.status_code}.",
        }
    return {"reachable": True}


@router.get("/mesh-instructions")
async def mesh_instructions() -> dict[str, Any]:
    """Proxy mesh GET /instructions?agent_name=… for Settings UI (file-backed baseline)."""
    base = resolve_mesh_base_url()
    url = f"{base.rstrip('/')}/instructions"
    params = {"agent_name": app_config.POOL_COACH_AGENT_NAME}
    try:
        async with httpx.AsyncClient(timeout=_MESH_INSTRUCTIONS_TIMEOUT) as client:
            r = await client.get(url, params=params)
    except httpx.TimeoutException:
        return {
            "ok": False,
            "content": "",
            "detail": "Mesh host did not respond in time.",
        }
    except httpx.RequestError:
        return {
            "ok": False,
            "content": "",
            "detail": "Could not connect to mesh host.",
        }
    if r.status_code != 200:
        return {
            "ok": False,
            "content": "",
            "detail": f"Mesh /instructions returned HTTP {r.status_code}.",
        }
    raw = r.text
    content = raw
    try:
        payload = json.loads(raw)
        if isinstance(payload, dict) and isinstance(payload.get("text"), str):
            content = payload["text"]
    except (json.JSONDecodeError, TypeError):
        pass
    return {"ok": True, "content": content, "detail": None}


@router.get("/pool-coach/cached")
async def pool_coach_cached(
    request: Request,
    scope: Literal["session", "progress"],
    session_id: str | None = Query(default=None, alias="sessionId"),
) -> dict[str, Any]:
    """Whether a saved coach analysis exists for this scope (progress respects reference-session cookie)."""
    active, needs = _profile_ctx(request)
    if needs or not active:
        return {"hasCached": False}
    if scope == "session":
        if not session_id:
            return {"hasCached": False}
        session = load_session_for_profile(
            session_id,
            active_profile_id=active,
            needs_first_profile=needs,
        )
        if not session:
            return {"hasCached": False}
        return {"hasCached": has_session_coach_cache(session_id)}
    ref = _reference_session_id(request)
    return {"hasCached": has_progress_coach_cache(active, reference_session_id=ref)}


def _api_shape_from_mesh(data: dict[str, Any], *, from_cache: bool) -> dict[str, Any]:
    return {
        "ok": bool(data.get("ok", True)),
        "blocked": bool(data.get("blocked", False)),
        "reason": data.get("reason"),
        "outputText": data.get("output_text") or data.get("outputText"),
        "meshSessionId": data.get("session_id") or data.get("sessionId"),
        "runtimeName": data.get("runtime_name"),
        "framework": data.get("framework"),
        "fromCache": from_cache,
    }


@router.post("/pool-coach")
async def pool_coach(request: Request, body: PoolCoachBody) -> dict[str, Any]:
    active, needs = _profile_ctx(request)
    if needs or not active:
        raise HTTPException(status_code=400, detail="No active player profile.")

    ref = _reference_session_id(request)

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
        raw_sessions = list_sessions(limit=500, profile_id=active)
        filtered, _ = filter_sessions_since_reference(raw_sessions, ref)
        payload = build_progress_coach_payload(filtered)

    if not body.regenerate:
        if body.scope == "session" and body.session_id:
            hit = load_session_coach_cache(body.session_id)
            if hit:
                return storable_to_api_response(hit["response"], from_cache=True)
        elif body.scope == "progress":
            hit = load_progress_coach_cache(active, reference_session_id=ref)
            if hit:
                return storable_to_api_response(hit["response"], from_cache=True)

    base = resolve_mesh_base_url()
    run_url = f"{base.rstrip('/')}/run"
    mesh_body: dict[str, Any] = {
        "runtime_name": app_config.POOL_COACH_RUNTIME_NAME,
        "agent_name": app_config.POOL_COACH_AGENT_NAME,
        "user_id": str(active),
        "tenant_id": app_config.MESH_TENANT_ID,
        "message": json.dumps(payload, separators=(",", ":"), ensure_ascii=False),
        "session_id": None,
    }
    override = (load_mesh_settings().system_instruction_override or "").strip()
    if override:
        mesh_body["system_instruction"] = override
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

    if body.scope == "session":
        sid = body.session_id
        if not sid:
            raise HTTPException(status_code=422, detail="sessionId is required for session scope.")
        save_session_coach_cache(sid, data)
    else:
        save_progress_coach_cache(active, data, reference_session_id=ref)

    return _api_shape_from_mesh(data, from_cache=False)
