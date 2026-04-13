from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

import app.config as app_config
from app.models import PrecisionSession, PrecisionSessionStatus
from app.services.atomic_json import write_json_atomic


def _sessions_dir() -> Path:
    return app_config.SESSIONS_DIR


def sessions_dir() -> Path:
    """Public path to the sessions directory (for profile backfill, etc.)."""
    return _sessions_dir()


def _session_path(session_id: str) -> Path:
    return _sessions_dir() / f"{session_id}.json"


def load_session(session_id: str) -> PrecisionSession | None:
    path = _session_path(session_id)
    if not path.exists():
        return None
    return PrecisionSession.model_validate(json.loads(path.read_text(encoding="utf-8")))


def save_session(session: PrecisionSession) -> None:
    path = _session_path(session.id)
    write_json_atomic(path, session.model_dump(by_alias=True))


def delete_session(session_id: str) -> bool:
    from app.services.pool_coach_cache import delete_session_coach_cache  # noqa: PLC0415

    s = load_session(session_id)
    path = _session_path(session_id)
    if not path.exists():
        return False
    if s and s.profile_id:
        from app.services import profiles_repo  # noqa: PLC0415

        profiles_repo.remove_session(s.profile_id, session_id)
    path.unlink()
    delete_session_coach_cache(session_id)
    return True


def list_sessions(
    *, limit: int = 200, profile_id: str | None = None
) -> list[PrecisionSession]:
    d = _sessions_dir()
    if not d.exists():
        return []
    out: list[PrecisionSession] = []
    for p in d.glob("*.json"):
        try:
            sess = PrecisionSession.model_validate(
                json.loads(p.read_text(encoding="utf-8"))
            )
        except (json.JSONDecodeError, ValueError):
            continue
        if profile_id is not None and sess.profile_id != profile_id:
            continue
        out.append(sess)
    out.sort(key=lambda s: s.started_at, reverse=True)
    return out[:limit]


def create_session_id() -> str:
    return str(uuid4())
