from __future__ import annotations

from typing import Any

from app.models import MissTypeCounts, PrecisionSession, PrecisionSessionStatus
from app.services.derived_metrics import (
    aggregate_sessions_progress,
    dashboard_metric_trend,
    miss_type_percentages,
    overall_position_success_breakdown,
    overall_pot_success_breakdown,
    recompute_session_aggregates,
)
from app.services.rack_conversion_tiers import overall_rack_conversion_breakdown
from app.services.training_tier import training_tier_label


def _rate01(v: float | None) -> float | None:
    if v is None:
        return None
    return round(float(v), 4)


def _failure_fractions(counts: MissTypeCounts) -> dict[str, float]:
    pct = miss_type_percentages(counts)
    return {
        "position": round(pct["position"] / 100.0, 4),
        "speed": round(pct["speed"] / 100.0, 4),
        "alignment": round(pct["alignment"] / 100.0, 4),
        "delivery": round(pct["delivery"] / 100.0, 4),
    }


def _merge_miss_type_counts(sessions: list[PrecisionSession]) -> MissTypeCounts:
    out = MissTypeCounts()
    for s in sessions:
        recompute_session_aggregates(s)
        c = s.miss_type_counts
        out.position += c.position
        out.alignment += c.alignment
        out.delivery += c.delivery
        out.speed += c.speed
    return out


def _progress_metric_sessions(sessions: list[PrecisionSession]) -> list[PrecisionSession]:
    """Same inclusion as aggregate_sessions_progress (completed, racks > 0)."""
    out: list[PrecisionSession] = []
    for s in sessions:
        if s.status != PrecisionSessionStatus.COMPLETED:
            continue
        recompute_session_aggregates(s)
        if s.total_racks == 0:
            continue
        out.append(s)
    out.sort(key=lambda x: x.started_at)
    return out


def build_session_coach_payload(session: PrecisionSession) -> dict[str, Any]:
    recompute_session_aggregates(session)
    tier = training_tier_label(
        session.pot_success_rate,
        session.position_success_rate,
        session.rack_conversion_rate,
    )
    racks_preview: list[dict[str, Any]] = []
    for r in session.racks[-12:]:
        racks_preview.append(
            {
                "rackNumber": r.rack_number,
                "ballsCleared": r.balls_cleared,
                "missCount": len(r.misses),
                "endedAt": r.ended_at,
            }
        )
    return {
        "kind": "session",
        "pot": _rate01(session.pot_success_rate),
        "position": _rate01(session.position_success_rate),
        "conversion": _rate01(session.rack_conversion_rate),
        "failure": _failure_fractions(session.miss_type_counts),
        "consistency": {
            "avg": session.avg_balls_cleared_per_rack,
            "best": session.best_rack_balls_cleared,
            "worst": session.worst_rack_balls_cleared,
        },
        "recovery": _rate01(session.recovery_rate),
        "context": {
            "sessionId": session.id,
            "programId": session.program_id,
            "planId": session.plan_id,
            "startedAt": session.started_at,
            "endedAt": session.ended_at,
            "tableType": session.table_type.value,
            "mode": session.mode.value,
            "durationSeconds": session.duration_seconds,
            "trainingTier": tier,
            "totalRacks": session.total_racks,
            "racksCompleted": session.racks_completed,
            "totalBallsCleared": session.total_balls_cleared,
            "trueMissCount": session.true_miss_count,
            "trainingMissCount": session.training_miss_count,
            "conversionEfficiency": _rate01(session.conversion_efficiency),
            "trueMissRate": session.true_miss_rate,
            "bestRunBalls": session.best_run_balls,
            "racksPreview": racks_preview,
        },
    }


def build_progress_coach_payload(sessions_filtered: list[PrecisionSession]) -> dict[str, Any]:
    metric_sessions = _progress_metric_sessions(sessions_filtered)
    pot_rate, pot_made, pot_att = overall_pot_success_breakdown(sessions_filtered)
    pos_rate, pos_miss, pos_cleared = overall_position_success_breakdown(sessions_filtered)
    rc_rate, rc_done, rc_total = overall_rack_conversion_breakdown(sessions_filtered)

    merged = _merge_miss_type_counts(metric_sessions)
    recovery_num = 0
    recovery_den = 0
    avgs: list[float] = []
    best_rack = 0
    worst_rack: int | None = None
    for s in metric_sessions:
        recovery_num += s.recovery_count
        recovery_den += s.recovery_count + s.failed_recovery_count
        if s.avg_balls_cleared_per_rack is not None:
            avgs.append(float(s.avg_balls_cleared_per_rack))
        best_rack = max(best_rack, s.best_rack_balls_cleared)
        if s.worst_rack_balls_cleared is not None:
            worst_rack = (
                s.worst_rack_balls_cleared
                if worst_rack is None
                else min(worst_rack, s.worst_rack_balls_cleared)
            )

    recovery: float | None
    if recovery_den > 0:
        recovery = round(recovery_num / recovery_den, 4)
    else:
        recovery = None

    avg_consistency = round(sum(avgs) / len(avgs), 2) if avgs else None

    progress_series = aggregate_sessions_progress(sessions_filtered)
    hero_pot_trend = dashboard_metric_trend(sessions_filtered, metric="pot")
    hero_pos_trend = dashboard_metric_trend(sessions_filtered, metric="position")
    hero_rack_trend = dashboard_metric_trend(sessions_filtered, metric="rack_conversion")

    date_span: dict[str, str | None] = {"from": None, "to": None}
    if metric_sessions:
        date_span["from"] = metric_sessions[0].started_at
        date_span["to"] = metric_sessions[-1].started_at

    return {
        "kind": "progress",
        "pot": _rate01(pot_rate),
        "position": _rate01(pos_rate),
        "conversion": _rate01(rc_rate),
        "failure": _failure_fractions(merged),
        "consistency": {
            "avg": avg_consistency,
            "best": (best_rack if metric_sessions else None),
            "worst": worst_rack,
        },
        "recovery": recovery,
        "context": {
            "sessionCount": len(metric_sessions),
            "dateSpan": date_span,
            "potMade": pot_made,
            "potAttempts": pot_att,
            "positionRelatedMisses": pos_miss,
            "ballsClearedForPosition": pos_cleared,
            "racksCompleted": rc_done,
            "totalRacks": rc_total,
            "heroTrends": {
                "pot": hero_pot_trend,
                "position": hero_pos_trend,
                "rackConversion": hero_rack_trend,
            },
            "progressSeries": progress_series,
        },
    }
