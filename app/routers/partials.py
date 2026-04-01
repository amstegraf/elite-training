from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.deps import get_templates
from app.services.session_store import load_session, session_totals
from app.services.time_util import effective_session_active_ms

router = APIRouter()


@router.get("/partials/session/{session_id}", response_class=HTMLResponse)
async def session_modal_partial(request: Request, session_id: str) -> object:
    session = load_session(session_id)
    if not session:
        return HTMLResponse("<p>Session not found.</p>", status_code=404)
    templates = get_templates()
    pr, fr, cpr = session_totals(session)
    duration_ms = effective_session_active_ms(session)
    if session.status.value not in ("active", "paused"):
        duration_ms = session.session_active_ms
    return templates.TemplateResponse(
        request,
        "partials/session_detail.html",
        {
            "session": session,
            "pr": pr,
            "fr": fr,
            "cpr_best": cpr,
            "duration_ms": duration_ms,
        },
    )
