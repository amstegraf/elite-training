from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Optional
from uuid import uuid4

from app.config import SESSIONS_DIR
from app.models import SessionStatus, TrainingBlock, TrainingSession, utc_now_iso
from app.services.time_util import flush_active_elapsed, pause_clock, resume_clock


def ensure_sessions_dir() -> None:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


def _path(session_id: str) -> Path:
    safe = session_id.replace(os.sep, "").replace("..", "")
    return SESSIONS_DIR / f"{safe}.json"


def save_session(session: TrainingSession) -> None:
    ensure_sessions_dir()
    path = _path(session.id)
    data = session.model_dump(mode="json")
    fd, tmp = tempfile.mkstemp(dir=SESSIONS_DIR, suffix=".json.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def load_session(session_id: str) -> Optional[TrainingSession]:
    path = _path(session_id)
    if not path.is_file():
        return None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return TrainingSession.model_validate(data)


def list_sessions() -> list[TrainingSession]:
    ensure_sessions_dir()
    out: list[TrainingSession] = []
    for p in SESSIONS_DIR.glob("*.json"):
        try:
            with open(p, encoding="utf-8") as f:
                data = json.load(f)
            out.append(TrainingSession.model_validate(data))
        except (json.JSONDecodeError, ValueError):
            continue
    return out


def create_session(focus: Optional[str] = None) -> TrainingSession:
    session = TrainingSession(
        id=str(uuid4()),
        status=SessionStatus.CREATED,
        focus=focus or None,
    )
    save_session(session)
    return session


def start_session(session_id: str) -> Optional[TrainingSession]:
    session = load_session(session_id)
    if not session:
        return None
    if session.status in (SessionStatus.COMPLETED, SessionStatus.ABANDONED):
        return session
    if session.status == SessionStatus.ACTIVE:
        return session
    from datetime import datetime, timezone

    session.status = SessionStatus.ACTIVE
    session.last_resume_at = datetime.now(timezone.utc).isoformat()
    save_session(session)
    return session


def pause_session(session_id: str) -> Optional[TrainingSession]:
    session = load_session(session_id)
    if not session or session.status != SessionStatus.ACTIVE:
        return session
    flush_active_elapsed(session)
    session.status = SessionStatus.PAUSED
    pause_clock(session)
    save_session(session)
    return session


def resume_session(session_id: str) -> Optional[TrainingSession]:
    session = load_session(session_id)
    if not session or session.status != SessionStatus.PAUSED:
        return session
    from datetime import datetime, timezone

    session.status = SessionStatus.ACTIVE
    session.last_resume_at = datetime.now(timezone.utc).isoformat()
    save_session(session)
    return session


def complete_session(session_id: str) -> Optional[TrainingSession]:
    session = load_session(session_id)
    if not session:
        return None
    if session.status == SessionStatus.ACTIVE:
        flush_active_elapsed(session)
    pause_clock(session)
    session.status = SessionStatus.COMPLETED
    session.ended_at = utc_now_iso()
    save_session(session)
    return session


def abandon_session(session_id: str) -> Optional[TrainingSession]:
    session = load_session(session_id)
    if not session:
        return None
    if session.status == SessionStatus.ACTIVE:
        flush_active_elapsed(session)
    pause_clock(session)
    session.status = SessionStatus.ABANDONED
    session.ended_at = utc_now_iso()
    save_session(session)
    return session


def add_block(
    session_id: str,
    name: str,
    purpose: str = "",
    target: Optional[str] = None,
) -> Optional[TrainingSession]:
    session = load_session(session_id)
    if not session:
        return None
    if session.status not in (SessionStatus.CREATED, SessionStatus.ACTIVE, SessionStatus.PAUSED):
        return session
    block = TrainingBlock(name=name, purpose=purpose or "", target=target)
    session.blocks.append(block)
    if session.current_block_id is None:
        session.current_block_id = block.id
    save_session(session)
    return session


def set_current_block(session_id: str, block_id: str) -> Optional[TrainingSession]:
    session = load_session(session_id)
    if not session:
        return None
    if not any(b.id == block_id for b in session.blocks):
        return session
    if session.status == SessionStatus.ACTIVE:
        flush_active_elapsed(session)
        resume_clock(session)
    session.current_block_id = block_id
    save_session(session)
    return session


def log_pr(session_id: str) -> Optional[TrainingSession]:
    session = load_session(session_id)
    if not session:
        return None
    block = session.current_block()
    if not block:
        return session
    if session.status == SessionStatus.ACTIVE:
        flush_active_elapsed(session)
        resume_clock(session)
    block.pr += 1
    block.attempts += 1
    block.cpr_current += 1
    if block.cpr_current > block.cpr_best:
        block.cpr_best = block.cpr_current
    save_session(session)
    return session


def log_fr(session_id: str) -> Optional[TrainingSession]:
    session = load_session(session_id)
    if not session:
        return None
    block = session.current_block()
    if not block:
        return session
    if session.status == SessionStatus.ACTIVE:
        flush_active_elapsed(session)
        resume_clock(session)
    block.fr += 1
    block.attempts += 1
    block.cpr_current = 0
    save_session(session)
    return session


def session_cpr_best(session: TrainingSession) -> int:
    return max((b.cpr_best for b in session.blocks), default=0)


def session_totals(session: TrainingSession) -> tuple[int, int, int]:
    pr = sum(b.pr for b in session.blocks)
    fr = sum(b.fr for b in session.blocks)
    return pr, fr, session_cpr_best(session)


def update_session_notes(session_id: str, notes: Optional[str]) -> Optional[TrainingSession]:
    session = load_session(session_id)
    if not session:
        return None
    session.notes = notes.strip() if notes else None
    save_session(session)
    return session


def delete_session(session_id: str) -> bool:
    """Remove session file from disk. Reports and dashboard ignore missing files."""
    path = _path(session_id)
    if not path.is_file():
        return False
    path.unlink()
    return True
