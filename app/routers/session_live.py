from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from app.deps import get_templates
from app.models import SessionStatus
from app.services.session_store import load_session
from app.timer_state import build_timer_state

router = APIRouter()


@router.get("/session/{session_id}")
async def session_page(request: Request, session_id: str) -> object:
    session = load_session(session_id)
    if not session:
        return RedirectResponse(url="/", status_code=302)
    templates = get_templates()
    state = build_timer_state(session)
    return templates.TemplateResponse(
        request,
        "session/live.html",
        {
            "session": session,
            "timer_state": state,
            "SessionStatus": SessionStatus,
        },
    )
