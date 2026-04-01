from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse

from app.deps import get_templates
from app.services.aggregates import dashboard_snapshot, personal_bests
from app.services.session_store import create_session, list_sessions

router = APIRouter()


@router.get("/")
async def dashboard(request: Request) -> object:
    sessions = list_sessions()
    sessions.sort(key=lambda s: s.started_at, reverse=True)
    templates = get_templates()
    return templates.TemplateResponse(
        request,
        "dashboard/index.html",
        {
            "sessions": sessions,
            "snapshot": dashboard_snapshot(),
            "bests": personal_bests(),
        },
    )


@router.post("/session/new")
async def new_session(
    focus: str = Form(""),
) -> RedirectResponse:
    s = create_session(focus=focus.strip() or None)
    return RedirectResponse(url=f"/session/{s.id}", status_code=303)
