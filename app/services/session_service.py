from __future__ import annotations

from app.models import (
    Confidence,
    MissEvent,
    MissOutcome,
    MissType,
    PrecisionSession,
    PrecisionSessionStatus,
    RackRecord,
    SessionMode,
    SessionRuleOverrides,
    TableType,
    utc_now_iso,
)
from app.services import programs_repo
from app.services.derived_metrics import (
    default_balls_cleared_for_rack,
    recompute_session_aggregates,
    suggested_next_ball_number,
)
from app.services.rules_engine import session_rules_summary
from app.services.sessions_repo import create_session_id, load_session, save_session


class SessionNotFoundError(Exception):
    pass


class BadRequestError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def _next_rack_number(session: PrecisionSession) -> int:
    if not session.racks:
        return 1
    return max(r.rack_number for r in session.racks) + 1


def start_session(
    *,
    plan_id: str,
    table_type: TableType,
    mode: SessionMode,
    rule_overrides: SessionRuleOverrides | None = None,
) -> PrecisionSession:
    root = programs_repo.load_programs_file()
    pair = programs_repo.get_plan(root, plan_id)
    if not pair:
        raise BadRequestError("Unknown planId")
    program, _plan = pair
    sid = create_session_id()
    rack = RackRecord(rack_number=1)
    session = PrecisionSession(
        id=sid,
        program_id=program.id,
        plan_id=plan_id,
        table_type=table_type,
        mode=mode,
        rule_overrides=rule_overrides,
        racks=[rack],
        current_rack_id=rack.id,
        last_unpaused_at=utc_now_iso(),
    )
    recompute_session_aggregates(session)
    save_session(session)
    return session


def end_session(session_id: str) -> PrecisionSession:
    session = load_session(session_id)
    if not session:
        raise SessionNotFoundError
    if session.status != PrecisionSessionStatus.IN_PROGRESS:
        raise BadRequestError("Session is not in progress")
    cur = session.current_rack()
    if cur and not cur.ended_at:
        raise BadRequestError("End the current rack before ending the session")
    session.status = PrecisionSessionStatus.COMPLETED
    session.ended_at = utc_now_iso()
    
    if not session.is_paused:
        t0 = session.last_unpaused_at or session.started_at
        if t0:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            last = datetime.fromisoformat(t0)
            session.duration_seconds += int(max(0, (now - last).total_seconds()))
    session.is_paused = True

    recompute_session_aggregates(session)
    save_session(session)
    return session


def start_rack(session_id: str) -> PrecisionSession:
    session = load_session(session_id)
    if not session:
        raise SessionNotFoundError
    if session.status != PrecisionSessionStatus.IN_PROGRESS:
        raise BadRequestError("Session is not in progress")
    cur = session.current_rack()
    if cur is not None and cur.ended_at is None:
        raise BadRequestError("Current rack is still open; end it first")
    rack = RackRecord(rack_number=_next_rack_number(session))
    session.racks.append(rack)
    session.current_rack_id = rack.id
    recompute_session_aggregates(session)
    save_session(session)
    return session


def end_rack(
    session_id: str,
    rack_id: str,
    *,
    balls_cleared: int | None = None,
) -> PrecisionSession:
    session = load_session(session_id)
    if not session:
        raise SessionNotFoundError
    if session.status != PrecisionSessionStatus.IN_PROGRESS:
        raise BadRequestError("Session is not in progress")
    rack = next((r for r in session.racks if r.id == rack_id), None)
    if not rack:
        raise BadRequestError("Unknown rack")
    if rack.ended_at:
        raise BadRequestError("Rack already ended")
    rack.ended_at = utc_now_iso()
    if balls_cleared is not None:
        rack.balls_cleared = balls_cleared
    elif rack.balls_cleared is None:
        rack.balls_cleared = default_balls_cleared_for_rack(rack)
    session.current_rack_id = None
    recompute_session_aggregates(session)
    save_session(session)
    return session


def add_miss(
    session_id: str,
    rack_id: str,
    *,
    ball_number: int,
    types: list[MissType],
    outcome: MissOutcome,
    confidence: Confidence | None,
) -> PrecisionSession:
    session = load_session(session_id)
    if not session:
        raise SessionNotFoundError
    if session.status != PrecisionSessionStatus.IN_PROGRESS:
        raise BadRequestError("Session is not in progress")
    rack = next((r for r in session.racks if r.id == rack_id), None)
    if not rack:
        raise BadRequestError("Unknown rack")
    if rack.ended_at:
        raise BadRequestError("Rack is closed")
    if not types:
        raise BadRequestError("Select at least one miss type")
    miss = MissEvent(
        ball_number=ball_number,
        types=types,
        outcome=outcome,
        confidence=confidence,
    )
    rack.misses.append(miss)
    recompute_session_aggregates(session)
    save_session(session)
    return session


def toggle_session_pause(session_id: str, pause: bool) -> PrecisionSession:
    session = load_session(session_id)
    if not session:
        raise SessionNotFoundError
    if session.status != PrecisionSessionStatus.IN_PROGRESS:
        raise BadRequestError("Session is not in progress")
        
    if session.is_paused == pause:
        return session
        
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if pause:
        t0 = session.last_unpaused_at or session.started_at
        if t0:
            last = datetime.fromisoformat(t0)
            elapsed = (now - last).total_seconds()
            session.duration_seconds += int(max(0, elapsed))
        session.is_paused = True
    else:
        session.is_paused = False
        session.last_unpaused_at = now.isoformat()
        
    save_session(session)
    return session


def get_live_context(session_id: str) -> dict:
    session = load_session(session_id)
    if not session:
        raise SessionNotFoundError
    root = programs_repo.load_programs_file()
    pair = programs_repo.get_plan(root, session.plan_id)
    rack = session.current_rack()
    if pair:
        _, plan = pair
        rules_out = session_rules_summary(session, plan.rules)
    else:
        rules_out = {
            "effectiveRules": None,
            "consecutiveMisses": len(rack.misses) if rack else 0,
            "warn": False,
            "resetSuggested": False,
        }
    rack_end_suggestion = None
    if rack and not rack.ended_at:
        rack_end_suggestion = default_balls_cleared_for_rack(rack)
        
    effective_duration = session.duration_seconds
    if not session.is_paused:
        t0 = session.last_unpaused_at or session.started_at
        if t0:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            last = datetime.fromisoformat(t0)
            effective_duration += int(max(0, (now - last).total_seconds()))
        
    return {
        "session": session.model_dump(by_alias=True),
        "suggestedNextBall": suggested_next_ball_number(rack),
        "rackEndSuggestion": rack_end_suggestion,
        "rules": rules_out,
        "effectiveDuration": effective_duration,
    }
