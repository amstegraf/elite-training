from __future__ import annotations

from fastapi import APIRouter, Form

from app.models import SessionStatus
from app.services import session_store as store
from app.timer_state import build_timer_state

router = APIRouter(prefix="/api/session", tags=["session-api"])


def _json(session):
    if session is None:
        return {"ok": False, "error": "Session not found"}
    return {"ok": True, "state": build_timer_state(session)}


@router.get("/{session_id}/state")
async def get_state(session_id: str) -> dict:
    session = store.load_session(session_id)
    if not session:
        return {"ok": False, "error": "Session not found"}
    return _json(session)


@router.post("/{session_id}/start")
async def api_start(session_id: str) -> dict:
    session = store.start_session(session_id)
    return _json(session)


@router.post("/{session_id}/pause")
async def api_pause(session_id: str) -> dict:
    session = store.pause_session(session_id)
    return _json(session)


@router.post("/{session_id}/resume")
async def api_resume(session_id: str) -> dict:
    session = store.resume_session(session_id)
    return _json(session)


@router.post("/{session_id}/complete")
async def api_complete(session_id: str) -> dict:
    session = store.complete_session(session_id)
    return _json(session)


@router.post("/{session_id}/abandon")
async def api_abandon(session_id: str) -> dict:
    session = store.abandon_session(session_id)
    return _json(session)


@router.post("/{session_id}/pr")
async def api_pr(session_id: str) -> dict:
    session = store.load_session(session_id)
    if not session:
        return {"ok": False, "error": "Session not found"}
    if session.status != SessionStatus.ACTIVE:
        return {"ok": False, "error": "Session must be active to log PR", "state": build_timer_state(session)}
    if not session.current_block():
        return {"ok": False, "error": "Add a block first", "state": build_timer_state(session)}
    session = store.log_pr(session_id)
    return _json(session)


@router.post("/{session_id}/fr")
async def api_fr(session_id: str) -> dict:
    session = store.load_session(session_id)
    if not session:
        return {"ok": False, "error": "Session not found"}
    if session.status != SessionStatus.ACTIVE:
        return {"ok": False, "error": "Session must be active to log FR", "state": build_timer_state(session)}
    if not session.current_block():
        return {"ok": False, "error": "Add a block first", "state": build_timer_state(session)}
    session = store.log_fr(session_id)
    return _json(session)


@router.post("/{session_id}/block")
async def api_add_block(
    session_id: str,
    name: str = Form(...),
    purpose: str = Form(""),
    target: str = Form(""),
) -> dict:
    session = store.add_block(
        session_id,
        name=name.strip() or "Block",
        purpose=purpose.strip(),
        target=target.strip() or None,
    )
    return _json(session)


@router.post("/{session_id}/block/current")
async def api_set_block(session_id: str, block_id: str = Form(...)) -> dict:
    session = store.set_current_block(session_id, block_id)
    return _json(session)


@router.post("/{session_id}/notes")
async def api_notes(session_id: str, notes: str = Form("")) -> dict:
    session = store.update_session_notes(session_id, notes)
    return _json(session)
