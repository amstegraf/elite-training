from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

import app.config as app_config
from app.models import PrecisionSession, PrecisionSessionStatus
from app.services.atomic_json import write_json_atomic


def _sessions_dir() -> Path:
    return app_config.SESSIONS_DIR


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
    path = _session_path(session_id)
    if not path.exists():
        return False
    path.unlink()
    return True


def list_sessions(*, limit: int = 200) -> list[PrecisionSession]:
    d = _sessions_dir()
    if not d.exists():
        return []
    out: list[PrecisionSession] = []
    for p in d.glob("*.json"):
        try:
            out.append(
                PrecisionSession.model_validate(
                    json.loads(p.read_text(encoding="utf-8"))
                )
            )
        except (json.JSONDecodeError, ValueError):
            continue
    out.sort(key=lambda s: s.started_at, reverse=True)
    return out[:limit]


def create_session_id() -> str:
    return str(uuid4())
