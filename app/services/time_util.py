from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models import TrainingSession, TrainingBlock


def parse_iso(ts: str) -> datetime:
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def flush_active_elapsed(session: "TrainingSession") -> None:
    """Add elapsed time since last_resume_at to session and current block."""
    from app.models import SessionStatus

    if session.status != SessionStatus.ACTIVE or not session.last_resume_at:
        return
    start = parse_iso(session.last_resume_at)
    delta_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    if delta_ms < 0:
        delta_ms = 0
    session.session_active_ms += delta_ms
    block = session.current_block()
    if block:
        block.block_active_ms += delta_ms
    session.last_resume_at = datetime.now(timezone.utc).isoformat()


def pause_clock(session: "TrainingSession") -> None:
    from app.models import SessionStatus

    if session.status == SessionStatus.ACTIVE:
        flush_active_elapsed(session)
    session.last_resume_at = None


def resume_clock(session: "TrainingSession") -> None:
    from datetime import datetime, timezone

    from app.models import SessionStatus

    if session.status == SessionStatus.ACTIVE:
        session.last_resume_at = datetime.now(timezone.utc).isoformat()


def effective_session_active_ms(session: "TrainingSession") -> int:
    """Total session active ms including in-flight interval since last_resume_at."""
    from app.models import SessionStatus

    base = session.session_active_ms
    if session.status != SessionStatus.ACTIVE or not session.last_resume_at:
        return base
    start = parse_iso(session.last_resume_at)
    extra = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    return base + max(0, extra)


def effective_block_active_ms(session: "TrainingSession", block: Optional["TrainingBlock"]) -> int:
    if not block:
        return 0
    base = block.block_active_ms
    if session.status != SessionStatus.ACTIVE or not session.last_resume_at:
        return base
    cur = session.current_block()
    if not cur or cur.id != block.id:
        return base
    start = parse_iso(session.last_resume_at)
    extra = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    return base + max(0, extra)
