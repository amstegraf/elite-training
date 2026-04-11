from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.models import (
    Confidence,
    MissOutcome,
    MissType,
    SessionMode,
    SessionRuleOverrides,
    TableType,
)
from app.services.session_service import (
    BadRequestError,
    SessionNotFoundError,
    add_miss,
    end_rack,
    end_session,
    get_live_context,
    start_rack,
    start_session,
)
from app.services.sessions_repo import delete_session, list_sessions, load_session

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class StartSessionBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plan_id: str = Field(alias="planId")
    table_type: TableType = Field(default=TableType.EIGHT_FT, alias="tableType")
    mode: SessionMode = SessionMode.RACK
    rule_overrides: SessionRuleOverrides | None = Field(default=None, alias="ruleOverrides")


class EndRackBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    balls_cleared: int | None = Field(default=None, ge=0, le=15, alias="ballsCleared")


class AddMissBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ball_number: int = Field(ge=1, le=15, alias="ballNumber")
    types: list[MissType]
    outcome: MissOutcome
    confidence: Confidence | None = None


def _handle(exc: Exception) -> None:
    if isinstance(exc, SessionNotFoundError):
        raise HTTPException(status_code=404, detail="Session not found") from exc
    if isinstance(exc, BadRequestError):
        raise HTTPException(status_code=400, detail=exc.message) from exc
    raise exc


@router.get("")
def api_list_sessions() -> dict:
    sessions = list_sessions()
    return {
        "sessions": [
            {
                "id": s.id,
                "planId": s.plan_id,
                "programId": s.program_id,
                "status": s.status.value,
                "startedAt": s.started_at,
                "endedAt": s.ended_at,
                "totalRacks": s.total_racks,
                "totalMisses": s.total_misses,
            }
            for s in sessions
        ]
    }


@router.get("/{session_id}")
def api_get_session(session_id: str) -> dict:
    s = load_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": s.model_dump(by_alias=True)}


@router.get("/{session_id}/live")
def api_live(session_id: str) -> dict:
    try:
        return get_live_context(session_id)
    except SessionNotFoundError as e:
        _handle(e)


@router.post("")
def api_start_session(body: StartSessionBody) -> dict:
    try:
        s = start_session(
            plan_id=body.plan_id,
            table_type=body.table_type,
            mode=body.mode,
            rule_overrides=body.rule_overrides,
        )
        return {"session": s.model_dump(by_alias=True)}
    except BadRequestError as e:
        _handle(e)


@router.post("/{session_id}/end")
def api_end_session(session_id: str) -> dict:
    try:
        s = end_session(session_id)
        return {"session": s.model_dump(by_alias=True)}
    except (SessionNotFoundError, BadRequestError) as e:
        _handle(e)


@router.post("/{session_id}/racks")
def api_start_rack(session_id: str) -> dict:
    try:
        s = start_rack(session_id)
        return {"session": s.model_dump(by_alias=True)}
    except (SessionNotFoundError, BadRequestError) as e:
        _handle(e)


@router.post("/{session_id}/racks/{rack_id}/end")
def api_end_rack(session_id: str, rack_id: str, body: EndRackBody | None = None) -> dict:
    try:
        s = end_rack(
            session_id,
            rack_id,
            balls_cleared=body.balls_cleared if body else None,
        )
        return {"session": s.model_dump(by_alias=True)}
    except (SessionNotFoundError, BadRequestError) as e:
        _handle(e)


@router.post("/{session_id}/racks/{rack_id}/misses")
def api_add_miss(session_id: str, rack_id: str, body: AddMissBody) -> dict:
    try:
        s = add_miss(
            session_id,
            rack_id,
            ball_number=body.ball_number,
            types=body.types,
            outcome=body.outcome,
            confidence=body.confidence,
        )
        return {"session": s.model_dump(by_alias=True)}
    except (SessionNotFoundError, BadRequestError) as e:
        _handle(e)


@router.delete("/{session_id}")
def api_delete_session(session_id: str) -> dict:
    if not delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}


class PauseSessionBody(BaseModel):
    pause: bool


@router.post("/{session_id}/pause")
def api_pause_session(session_id: str, body: PauseSessionBody) -> dict:
    from app.services.session_service import toggle_session_pause
    try:
        s = toggle_session_pause(session_id, body.pause)
        return {"session": s.model_dump(by_alias=True)}
    except (SessionNotFoundError, BadRequestError) as e:
        _handle(e)
