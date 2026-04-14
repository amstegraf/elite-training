from __future__ import annotations

import json
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from app.deps import get_templates
from app.models import PrecisionSessionStatus
from app.services import programs_repo
from app.services.dashboard_reference_session import (
    REFERENCE_SESSION_COOKIE_NAME,
    filter_sessions_since_reference,
)
from app.services.derived_metrics import (
    aggregate_sessions_progress,
    best_run_balls_for_rack,
    dashboard_metric_trend,
    miss_type_percentages,
    overall_position_success_breakdown,
    overall_pot_success_breakdown,
    rack_granular_position_speed_series,
    recompute_session_aggregates,
)
from app.services.rack_conversion_tiers import overall_rack_conversion_breakdown
from app.services.training_tier import training_tier_label
from app.services.session_service import load_session_for_profile
from app.services.sessions_repo import list_sessions

router = APIRouter()


@router.get("/mobile/connect")
async def mobile_connect_page(
    request: Request, baseUrl: str = "", sessionId: str = "", token: str = ""
) -> object:
    templates = get_templates()
    return templates.TemplateResponse(
        request,
        "session/mobile_connect.html",
        {
            "base_url": baseUrl,
            "session_id": sessionId,
            "token": token,
        },
    )


@router.get("/session/{session_id}")
async def session_live_page(request: Request, session_id: str) -> object:
    active = getattr(request.state, "active_profile_id", None)
    needs = getattr(request.state, "needs_first_profile", False)
    if needs or not active:
        return RedirectResponse(url="/", status_code=302)
    session = load_session_for_profile(
        session_id,
        active_profile_id=active,
        needs_first_profile=needs,
    )
    if not session:
        return RedirectResponse(url="/", status_code=302)
    if session.status == PrecisionSessionStatus.COMPLETED:
        return RedirectResponse(url=f"/session/{session_id}/report", status_code=302)
    templates = get_templates()
    root = programs_repo.load_programs_file()
    pair = programs_repo.get_plan(root, session.plan_id)
    program_name = pair[0].name if pair else "Program"
    plan_name = pair[1].name if pair else "Plan"
    return templates.TemplateResponse(
        request,
        "session/live.html",
        {
            "session": session,
            "program_name": program_name,
            "plan_name": plan_name,
        },
    )


@router.get("/session/{session_id}/report")
async def session_report_page(request: Request, session_id: str) -> object:
    active = getattr(request.state, "active_profile_id", None)
    needs = getattr(request.state, "needs_first_profile", False)
    if needs or not active:
        return RedirectResponse(url="/", status_code=302)
    session = load_session_for_profile(
        session_id,
        active_profile_id=active,
        needs_first_profile=needs,
    )
    if not session:
        return RedirectResponse(url="/", status_code=302)
    # Derive totals (e.g. totalBallsCleared, flow efficiency, true miss rate, rack conversion, rack spread) from racks
    # stored session fields, so older JSON without those keys still reports correctly.
    recompute_session_aggregates(session)
    training_tier = training_tier_label(
        session.pot_success_rate,
        session.position_success_rate,
        session.rack_conversion_rate,
    )
    templates = get_templates()
    root = programs_repo.load_programs_file()
    pair = programs_repo.get_plan(root, session.plan_id)
    program_name = pair[0].name if pair else "Program"
    plan_name = pair[1].name if pair else "Plan"
    pct = miss_type_percentages(session.miss_type_counts)
    
    # Chart data
    pos_spd = rack_granular_position_speed_series(session)
    rack_runs = [best_run_balls_for_rack(r) for r in session.racks if r.ended_at]
    chart_data = {
        "labels": pos_spd["labels"],
        "runs": rack_runs,
        "position_misses_per_rack": pos_spd["position_misses_per_rack"],
        "speed_misses_per_rack": pos_spd["speed_misses_per_rack"],
    }

    return templates.TemplateResponse(
        request,
        "session/report.html",
        {
            "session": session,
            "program_name": program_name,
            "plan_name": plan_name,
            "miss_type_pct": pct,
            "chart_data_json": json.dumps(chart_data),
            "training_tier": training_tier,
        },
    )


@router.get("/history")
async def history_page(request: Request) -> object:
    templates = get_templates()
    root = programs_repo.load_programs_file()
    needs = getattr(request.state, "needs_first_profile", False)
    active = getattr(request.state, "active_profile_id", None)
    sessions = (
        []
        if (needs or not active)
        else list_sessions(limit=200, profile_id=active)
    )
    plan_labels: dict[str, str] = {}
    for p in root.programs:
        for pl in p.plans:
            plan_labels[pl.id] = f"{p.name} — {pl.name}"
    return templates.TemplateResponse(
        request,
        "history/index.html",
        {"sessions": sessions, "plan_labels": plan_labels},
    )


@router.get("/progress")
async def progress_page(request: Request) -> object:
    templates = get_templates()
    needs = getattr(request.state, "needs_first_profile", False)
    active = getattr(request.state, "active_profile_id", None)
    if needs or not active:
        metrics_sessions = []
    else:
        raw = list_sessions(limit=500, profile_id=active)
        ref = (request.cookies.get(REFERENCE_SESSION_COOKIE_NAME) or "").strip()
        metrics_sessions, _ = filter_sessions_since_reference(raw, ref or None)

    progress_data = aggregate_sessions_progress(metrics_sessions)

    if not needs and active:
        pot_rate, pot_made, pot_att = overall_pot_success_breakdown(metrics_sessions)
        pos_rate, pos_miss, pos_cleared = overall_position_success_breakdown(
            metrics_sessions
        )
        g_rate, g_rc, g_tr = overall_rack_conversion_breakdown(metrics_sessions)
        progress_data["hero_pot_pct"] = (
            round(pot_rate * 1000) / 10 if pot_rate is not None else None
        )
        progress_data["hero_pot_made"] = pot_made
        progress_data["hero_pot_attempts"] = pot_att
        progress_data["hero_pos_pct"] = (
            round(pos_rate * 1000) / 10 if pos_rate is not None else None
        )
        progress_data["hero_pos_miss"] = pos_miss
        progress_data["hero_pos_cleared"] = pos_cleared
        progress_data["hero_rack_conv_pct"] = (
            round(g_rate * 1000) / 10 if g_rate is not None else None
        )
        progress_data["hero_racks_completed"] = g_rc
        progress_data["hero_total_racks"] = g_tr
        progress_data["hero_pot_trend"] = dashboard_metric_trend(
            metrics_sessions, metric="pot"
        )
        progress_data["hero_position_trend"] = dashboard_metric_trend(
            metrics_sessions, metric="position"
        )
        progress_data["hero_rack_trend"] = dashboard_metric_trend(
            metrics_sessions, metric="rack_conversion"
        )

    return templates.TemplateResponse(
        request,
        "progress/index.html",
        {
            "progress_data_json": json.dumps(progress_data),
        },
    )
