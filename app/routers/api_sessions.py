from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.models import (
    MissOutcome,
    MissType,
    PrecisionSession,
    SessionMode,
    SessionRuleOverrides,
    TableType,
)
from app.services import profiles_repo
from app.services.mobile_pairing import (
    build_connect_payload,
    issue_pair_token,
    validate_pair_token,
)
from app.services.session_service import (
    BadRequestError,
    SessionNotFoundError,
    add_miss,
    end_rack,
    end_session,
    get_live_context,
    load_session_for_profile,
    start_rack,
    start_session,
)
from app.services.sessions_repo import delete_session, list_sessions, load_session, save_session

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


def _profile_ctx(request: Request) -> tuple[str | None, bool]:
    return (
        getattr(request.state, "active_profile_id", None),
        getattr(request.state, "needs_first_profile", False),
    )


def _guard_session(request: Request, session_id: str) -> PrecisionSession:
    active, needs = _profile_ctx(request)
    s = load_session_for_profile(
        session_id,
        active_profile_id=active,
        needs_first_profile=needs,
    )
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


def _active_profile_for_import(request: Request) -> str | None:
    hdr = request.headers.get("x-elite-profile-id", "").strip()
    if hdr and profiles_repo.load_profile(hdr):
        return hdr
    return getattr(request.state, "active_profile_id", None)


def _handle(exc: Exception) -> None:
    if isinstance(exc, SessionNotFoundError):
        raise HTTPException(status_code=404, detail="Session not found") from exc
    if isinstance(exc, BadRequestError):
        raise HTTPException(status_code=400, detail=exc.message) from exc
    raise exc


def _bearer_token(request: Request) -> str | None:
    auth = request.headers.get("authorization", "").strip()
    if not auth:
        return None
    parts = auth.split(" ", 1)
    if len(parts) != 2:
        return None
    if parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def _is_mobile_request(request: Request) -> bool:
    if "/mobile/" in request.url.path:
        return True
    if request.headers.get("x-elite-mobile-client", "").strip():
        return True
    return _bearer_token(request) is not None


def _guard_mobile_or_desktop_session(request: Request, session_id: str) -> PrecisionSession:
    if not _is_mobile_request(request):
        return _guard_session(request, session_id)
    token = _bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing mobile pairing token")
    if not validate_pair_token(token, session_id=session_id):
        raise HTTPException(status_code=401, detail="Invalid or expired mobile pairing token")
    s = load_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


@router.get("")
def api_list_sessions(request: Request) -> dict:
    active, needs = _profile_ctx(request)
    if needs or not active:
        return {"sessions": []}
    sessions = list_sessions(profile_id=active)
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


@router.post("/import")
def api_import_session(
    request: Request, payload: dict, *, overwrite: bool = False
) -> dict:
    """Import a full session JSON document (same schema as on disk). Used by the Electron shell."""
    if getattr(request.state, "needs_first_profile", False):
        raise HTTPException(
            status_code=400,
            detail="Create a player profile in the app before importing sessions.",
        )
    profile_id = _active_profile_for_import(request)
    if not profile_id:
        raise HTTPException(
            status_code=400,
            detail="No active player profile for import (sign in via the app or send X-Elite-Profile-Id).",
        )
    try:
        s = PrecisionSession.model_validate(payload)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors()) from e
    existing = load_session(s.id)
    if existing is not None and not overwrite:
        raise HTTPException(
            status_code=409,
            detail={"message": "Session already exists", "id": s.id},
        )
    if existing is not None and overwrite and existing.profile_id:
        if existing.profile_id != profile_id:
            profiles_repo.remove_session(existing.profile_id, s.id)
    s.profile_id = profile_id
    save_session(s)
    profiles_repo.append_session(profile_id, s.id)
    return {"ok": True, "id": s.id}


@router.get("/{session_id}")
def api_get_session(request: Request, session_id: str) -> dict:
    active, needs = _profile_ctx(request)
    s = load_session_for_profile(
        session_id,
        active_profile_id=active,
        needs_first_profile=needs,
    )
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": s.model_dump(by_alias=True)}


@router.get("/{session_id}/live")
def api_live(request: Request, session_id: str) -> dict:
    if _is_mobile_request(request):
        _guard_mobile_or_desktop_session(request, session_id)
        active, needs = (None, False)
    else:
        active, needs = _profile_ctx(request)
    try:
        return get_live_context(
            session_id,
            active_profile_id=active,
            needs_first_profile=needs,
        )
    except SessionNotFoundError as e:
        _handle(e)


@router.post("")
def api_start_session(request: Request, body: StartSessionBody) -> dict:
    if getattr(request.state, "needs_first_profile", False):
        raise HTTPException(
            status_code=400,
            detail="Create a player profile before starting a session.",
        )
    active = getattr(request.state, "active_profile_id", None)
    if not active:
        raise HTTPException(status_code=400, detail="No active player profile.")
    try:
        s = start_session(
            plan_id=body.plan_id,
            table_type=body.table_type,
            mode=body.mode,
            rule_overrides=body.rule_overrides,
            profile_id=active,
        )
        return {"session": s.model_dump(by_alias=True)}
    except BadRequestError as e:
        _handle(e)


@router.post("/{session_id}/end")
def api_end_session(request: Request, session_id: str) -> dict:
    _guard_session(request, session_id)
    try:
        s = end_session(session_id)
        return {"session": s.model_dump(by_alias=True)}
    except (SessionNotFoundError, BadRequestError) as e:
        _handle(e)


@router.post("/{session_id}/racks")
def api_start_rack(request: Request, session_id: str) -> dict:
    _guard_mobile_or_desktop_session(request, session_id)
    try:
        s = start_rack(session_id)
        return {"session": s.model_dump(by_alias=True)}
    except (SessionNotFoundError, BadRequestError) as e:
        _handle(e)


@router.post("/{session_id}/racks/{rack_id}/end")
def api_end_rack(
    request: Request, session_id: str, rack_id: str, body: EndRackBody | None = None
) -> dict:
    _guard_mobile_or_desktop_session(request, session_id)
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
def api_add_miss(
    request: Request, session_id: str, rack_id: str, body: AddMissBody
) -> dict:
    _guard_mobile_or_desktop_session(request, session_id)
    try:
        s = add_miss(
            session_id,
            rack_id,
            ball_number=body.ball_number,
            types=body.types,
            outcome=body.outcome,
        )
        return {"session": s.model_dump(by_alias=True)}
    except (SessionNotFoundError, BadRequestError) as e:
        _handle(e)


@router.post("/{session_id}/mobile/connect")
def api_mobile_connect(request: Request, session_id: str) -> dict:
    s = _guard_session(request, session_id)
    rec = issue_pair_token(session_id=session_id, profile_id=s.profile_id)
    return build_connect_payload(request, rec)


@router.get("/{session_id}/mobile/live")
def api_mobile_live(request: Request, session_id: str) -> dict:
    _guard_mobile_or_desktop_session(request, session_id)
    context = get_live_context(session_id, active_profile_id=None, needs_first_profile=False)
    session = context["session"]
    rack_id = session["currentRackId"]
    racks = session.get("racks", [])
    rack = next((r for r in racks if r.get("id") == rack_id), None)
    current_rack_misses = rack.get("misses", []) if rack else []

    played: set[int] = set()
    suggested = context.get("suggestedNextBall")
    if isinstance(suggested, int) and suggested > 1:
        played.update(range(1, min(10, suggested)))
    for m in current_rack_misses:
        b = m.get("ballNumber")
        if isinstance(b, int) and 1 <= b <= 9:
            played.add(b)

    recent: list[dict] = []
    for r in racks:
        rack_number = r.get("rackNumber")
        for m in r.get("misses", []):
            recent.append(
                {
                    "rackNumber": rack_number,
                    "ballNumber": m.get("ballNumber"),
                    "types": m.get("types", []),
                    "outcome": m.get("outcome"),
                    "createdAt": m.get("createdAt"),
                }
            )
    recent.sort(key=lambda x: x.get("createdAt") or "", reverse=True)
    return {
        "sessionId": session["id"],
        "status": session["status"],
        "isPaused": session.get("isPaused", False),
        "currentRackId": rack_id,
        "suggestedNextBall": suggested,
        "effectiveDuration": context.get("effectiveDuration"),
        "playedBallNumbers": sorted(played),
        "recentMisses": recent[:20],
    }


@router.delete("/{session_id}")
def api_delete_session(request: Request, session_id: str) -> dict:
    _guard_session(request, session_id)
    if not delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}


class PauseSessionBody(BaseModel):
    pause: bool


@router.post("/{session_id}/pause")
def api_pause_session(
    request: Request, session_id: str, body: PauseSessionBody
) -> dict:
    from app.services.session_service import toggle_session_pause

    _guard_mobile_or_desktop_session(request, session_id)
    try:
        s = toggle_session_pause(session_id, body.pause)
        return {"session": s.model_dump(by_alias=True)}
    except (SessionNotFoundError, BadRequestError) as e:
        _handle(e)
