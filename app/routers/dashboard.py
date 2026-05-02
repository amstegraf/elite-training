from __future__ import annotations

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse

from app.deps import get_templates
from app.models import (
    FocusType,
    PrecisionSession,
    PrecisionSessionStatus,
    SessionMode,
    TableType,
)
from app.services import programs_repo
from app.services.dashboard_reference_session import (
    REFERENCE_SESSION_COOKIE_NAME,
    clear_reference_session_cookie,
    filter_sessions_since_reference,
    set_reference_session_cookie,
)
from app.services.derived_metrics import (
    dashboard_global_progress_vs_baseline,
    dashboard_metric_trend,
    overall_position_success_breakdown,
    overall_pot_success_breakdown,
)
from app.services.rack_conversion_tiers import overall_rack_conversion_breakdown
from app.services.training_tier import training_tier_dashboard_meta, training_tier_label
from app.services.session_service import BadRequestError, start_session
from app.services.sessions_repo import list_sessions, load_session

router = APIRouter()


def _latest_in_progress(profile_id: str) -> str | None:
    for s in list_sessions(limit=50, profile_id=profile_id):
        if s.status == PrecisionSessionStatus.IN_PROGRESS:
            return s.id
    return None


@router.get("/")
async def dashboard(request: Request) -> object:
    programs_root = programs_repo.load_programs_file()
    templates = get_templates()
    needs = getattr(request.state, "needs_first_profile", False)
    active = getattr(request.state, "active_profile_id", None)

    all_sessions: list[PrecisionSession] = []
    metrics_sessions: list[PrecisionSession] = []
    reference_resolved_id: str | None = None
    reference_started_at: str | None = None
    stale_reference_cookie = False
    cont: str | None = None

    if not needs and active:
        cont = _latest_in_progress(active)
        all_sessions = list_sessions(limit=500, profile_id=active)
        ref_cookie = (request.cookies.get(REFERENCE_SESSION_COOKIE_NAME) or "").strip()
        metrics_sessions, reference_resolved_id = filter_sessions_since_reference(
            all_sessions, ref_cookie or None
        )
        stale_reference_cookie = bool(ref_cookie) and reference_resolved_id is None
        ref_sess = (
            next((s for s in all_sessions if s.id == reference_resolved_id), None)
            if reference_resolved_id
            else None
        )
        reference_started_at = ref_sess.started_at if ref_sess else None
    else:
        metrics_sessions = []

    dashboard_kpi_progress = dashboard_global_progress_vs_baseline(metrics_sessions)

    g_rate, g_rc, g_tr = overall_rack_conversion_breakdown(metrics_sessions)
    pot_rate, pot_made, pot_att = overall_pot_success_breakdown(metrics_sessions)
    pos_rate, pos_miss, pos_cleared = overall_position_success_breakdown(metrics_sessions)
    pot_trend = dashboard_metric_trend(metrics_sessions, metric="pot")
    position_trend = dashboard_metric_trend(metrics_sessions, metric="position")
    rack_trend = dashboard_metric_trend(metrics_sessions, metric="rack_conversion")
    global_training_tier = training_tier_label(pot_rate, pos_rate, g_rate)
    global_training_tier_meta = training_tier_dashboard_meta(pot_rate, pos_rate, g_rate)

    response = templates.TemplateResponse(
        request,
        "dashboard/index.html",
        {
            "programs_root": programs_root,
            "continue_session_id": cont,
            "recent_sessions": all_sessions[:15],
            "global_rack_conversion_rate": g_rate,
            "global_training_tier": global_training_tier,
            "global_training_tier_meta": global_training_tier_meta,
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
            "dashboard_kpi_progress": dashboard_kpi_progress,
            "dashboard_reference_session_id": reference_resolved_id,
            "dashboard_reference_started_at": reference_started_at,
            "dashboard_metrics_session_count": len(metrics_sessions),
            "dashboard_all_sessions_count": len(all_sessions),
        },
    )
    if stale_reference_cookie:
        clear_reference_session_cookie(response)
    return response


@router.post("/actions/dashboard/reference-session")
async def action_dashboard_reference_session(
    request: Request,
    session_id: str = Form(""),
    clear: str = Form(""),
) -> RedirectResponse:
    if getattr(request.state, "needs_first_profile", False) or not getattr(
        request.state, "active_profile_id", None
    ):
        return RedirectResponse(url="/", status_code=303)
    active = request.state.active_profile_id
    resp = RedirectResponse(url="/", status_code=303)
    if clear == "1" or not session_id.strip():
        clear_reference_session_cookie(resp)
        return resp
    sid = session_id.strip()
    s = load_session(sid)
    if s is None or s.profile_id != active:
        return resp
    set_reference_session_cookie(resp, sid)
    return resp


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
    request: Request,
    plan_id: str = Form(...),
    table_type: str = Form("eight_ft"),
    mode: str = Form("rack"),
) -> RedirectResponse:
    if getattr(request.state, "needs_first_profile", False) or not getattr(
        request.state, "active_profile_id", None
    ):
        return RedirectResponse(url="/?err=start", status_code=303)
    try:
        s = start_session(
            plan_id=plan_id,
            table_type=TableType(table_type),
            mode=SessionMode(mode),
            profile_id=request.state.active_profile_id,
        )
    except BadRequestError:
        return RedirectResponse(url="/?err=start", status_code=303)
    return RedirectResponse(url=f"/session/{s.id}", status_code=303)
