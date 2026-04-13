from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import app.config as app_config

from app.services.atomic_json import write_json_atomic


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def session_coach_path(session_id: str) -> Path:
    """Sidecar next to ``{session_id}.json`` — not a valid PrecisionSession document."""
    return app_config.SESSIONS_DIR / f"{session_id}.coach.json"


def progress_coach_path(profile_id: str) -> Path:
    """Per profile; skipped by ``list_profiles`` (not a PlayerProfile document)."""
    return app_config.PROFILES_DIR / f"{profile_id}.pool_progress_coach.json"


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def load_session_coach_cache(session_id: str) -> dict[str, Any] | None:
    raw = _read_json(session_coach_path(session_id))
    if not raw or not isinstance(raw.get("response"), dict):
        return None
    return raw


def load_progress_coach_cache(
    profile_id: str, *, reference_session_id: str | None
) -> dict[str, Any] | None:
    raw = _read_json(progress_coach_path(profile_id))
    if not raw or not isinstance(raw.get("response"), dict):
        return None
    stored_ref = raw.get("referenceSessionId")
    if stored_ref is not None and not isinstance(stored_ref, str):
        stored_ref = None
    if stored_ref != reference_session_id:
        return None
    return raw


def has_session_coach_cache(session_id: str) -> bool:
    return load_session_coach_cache(session_id) is not None


def has_progress_coach_cache(
    profile_id: str, *, reference_session_id: str | None
) -> bool:
    return load_progress_coach_cache(profile_id, reference_session_id=reference_session_id) is not None


def mesh_response_to_storable(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "ok": bool(data.get("ok", True)),
        "blocked": bool(data.get("blocked", False)),
        "reason": data.get("reason"),
        "outputText": data.get("output_text") or data.get("outputText"),
        "meshSessionId": data.get("session_id") or data.get("sessionId"),
        "runtimeName": data.get("runtime_name"),
        "framework": data.get("framework"),
    }


def storable_to_api_response(stored: dict[str, Any], *, from_cache: bool) -> dict[str, Any]:
    r = dict(stored)
    r["fromCache"] = from_cache
    return r


def save_session_coach_cache(session_id: str, mesh_json: dict[str, Any]) -> None:
    doc = {
        "schemaVersion": 1,
        "scope": "session",
        "sessionId": session_id,
        "savedAt": _utc_now_iso(),
        "response": mesh_response_to_storable(mesh_json),
    }
    write_json_atomic(session_coach_path(session_id), doc)


def save_progress_coach_cache(
    profile_id: str,
    mesh_json: dict[str, Any],
    *,
    reference_session_id: str | None,
) -> None:
    doc = {
        "schemaVersion": 1,
        "scope": "progress",
        "profileId": profile_id,
        "referenceSessionId": reference_session_id,
        "savedAt": _utc_now_iso(),
        "response": mesh_response_to_storable(mesh_json),
    }
    write_json_atomic(progress_coach_path(profile_id), doc)


def delete_session_coach_cache(session_id: str) -> None:
    p = session_coach_path(session_id)
    if p.exists():
        p.unlink()


def delete_progress_coach_cache(profile_id: str) -> None:
    p = progress_coach_path(profile_id)
    if p.exists():
        p.unlink()
