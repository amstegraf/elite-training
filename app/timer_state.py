from __future__ import annotations

from typing import Any

from app.models import TrainingSession
from app.services.session_store import session_totals
from app.services.time_util import effective_block_active_ms, effective_session_active_ms


def build_timer_state(session: TrainingSession) -> dict[str, Any]:
    cur = session.current_block()
    pr, fr, cpr_sess = session_totals(session)
    return {
        "session_id": session.id,
        "status": session.status.value,
        "session_active_ms": effective_session_active_ms(session),
        "block_active_ms": effective_block_active_ms(session, cur),
        "current_block_id": cur.id if cur else None,
        "pr_total": pr,
        "fr_total": fr,
        "cpr_session_best": cpr_sess,
        "cpr_block_current": cur.cpr_current if cur else 0,
        "cpr_block_best": cur.cpr_best if cur else 0,
    }
