from __future__ import annotations

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse

from app.deps import get_templates
from app.models import FocusType, PrecisionSessionStatus, SessionMode, TableType
from app.services import programs_repo
from app.services.derived_metrics import (
    dashboard_metric_trend,
    overall_position_success_breakdown,
    overall_pot_success_breakdown,
)
from app.services.rack_conversion_tiers import (
    overall_rack_conversion_breakdown,
    rack_conversion_tier_label,
)
from app.services.session_service import BadRequestError, start_session
from app.services.sessions_repo import list_sessions

router = APIRouter()


def _latest_in_progress() -> str | None:
    for s in list_sessions(limit=50):
        if s.status == PrecisionSessionStatus.IN_PROGRESS:
            return s.id
    return None


@router.get("/")
async def dashboard(request: Request) -> object:
    programs_root = programs_repo.load_programs_file()
    templates = get_templates()
    cont = _latest_in_progress()
    all_sessions = list_sessions(limit=500)
    g_rate, g_rc, g_tr = overall_rack_conversion_breakdown(all_sessions)
    global_rack_tier = rack_conversion_tier_label(g_rate)
    pot_rate, pot_made, pot_att = overall_pot_success_breakdown(all_sessions)
    pos_rate, pos_miss, pos_cleared = overall_position_success_breakdown(all_sessions)
    pot_trend = dashboard_metric_trend(all_sessions, metric="pot")
    position_trend = dashboard_metric_trend(all_sessions, metric="position")
    rack_trend = dashboard_metric_trend(all_sessions, metric="rack_conversion")
    return templates.TemplateResponse(
        request,
        "dashboard/index.html",
        {
            "programs_root": programs_root,
            "continue_session_id": cont,
            "recent_sessions": all_sessions[:15],
            "global_rack_conversion_rate": g_rate,
            "global_rack_conversion_tier": global_rack_tier,
            "global_racks_completed": g_rc,
            "global_total_racks": g_tr,
            "global_pot_success_rate": pot_rate,
            "global_pot_potted": pot_made,
            "global_pot_attempts": pot_att,
            "global_position_success_rate": pos_rate,
            "global_position_miss_events": pos_miss,
            "global_position_balls_cleared": pos_cleared,
            "dashboard_pot_trend": pot_trend,
            "dashboard_position_trend": position_trend,
            "dashboard_rack_trend": rack_trend,
        },
    )


@router.post("/actions/program")
async def action_create_program(
    name: str = Form(...),
    duration_days: int = Form(90),
) -> RedirectResponse:
    root = programs_repo.load_programs_file()
    programs_repo.create_program(root, name, duration_days)
    return RedirectResponse(url="/", status_code=303)


@router.post("/actions/plan")
async def action_create_plan(
    program_id: str = Form(...),
    name: str = Form(...),
    focus_type: str = Form(...),
    target_diameter_cm: str = Form(""),
    sessions_per_week: str = Form(""),
    duration_weeks: str = Form(""),
) -> RedirectResponse:
    root = programs_repo.load_programs_file()
    td = target_diameter_cm.strip()
    spw = sessions_per_week.strip()
    dw = duration_weeks.strip()
    programs_repo.add_plan(
        root,
        program_id,
        name=name,
        focus_type=FocusType(focus_type),
        target_diameter_cm=float(td) if td else None,
        sessions_per_week=int(spw) if spw else None,
        duration_weeks=int(dw) if dw else None,
    )
    return RedirectResponse(url="/", status_code=303)


@router.post("/actions/program/{program_id}/active")
async def action_set_active_program(program_id: str) -> RedirectResponse:
    root = programs_repo.load_programs_file()
    if programs_repo.set_active_program(root, program_id) is None:
        return RedirectResponse(url="/", status_code=303)
    return RedirectResponse(url="/", status_code=303)


@router.post("/actions/program/{program_id}/delete")
async def action_delete_program(program_id: str) -> RedirectResponse:
    root = programs_repo.load_programs_file()
    programs_repo.delete_program(root, program_id)
    return RedirectResponse(url="/", status_code=303)


@router.post("/actions/plan/{program_id}/{plan_id}/delete")
async def action_delete_plan(program_id: str, plan_id: str) -> RedirectResponse:
    root = programs_repo.load_programs_file()
    programs_repo.delete_plan(root, program_id, plan_id)
    return RedirectResponse(url="/", status_code=303)


@router.post("/actions/session/start")
async def action_start_session(
    plan_id: str = Form(...),
    table_type: str = Form("eight_ft"),
    mode: str = Form("rack"),
) -> RedirectResponse:
    try:
        s = start_session(
            plan_id=plan_id,
            table_type=TableType(table_type),
            mode=SessionMode(mode),
        )
    except BadRequestError:
        return RedirectResponse(url="/?err=start", status_code=303)
    return RedirectResponse(url=f"/session/{s.id}", status_code=303)
