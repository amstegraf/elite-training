from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from app.models import SessionStatus, TrainingSession
from app.services.session_store import list_sessions, session_cpr_best, session_totals
from app.services.time_util import effective_session_active_ms, parse_iso


def _week_key(dt: datetime) -> str:
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def _session_start_dt(session: TrainingSession) -> datetime:
    return parse_iso(session.started_at)


def _session_duration_ms(session: TrainingSession) -> int:
    if session.status == SessionStatus.ACTIVE:
        return effective_session_active_ms(session)
    return session.session_active_ms


def load_all_sessions(include_abandoned: bool = False) -> list[TrainingSession]:
    sessions = list_sessions()
    if include_abandoned:
        return sessions
    return [s for s in sessions if s.status != SessionStatus.ABANDONED]


def dashboard_snapshot() -> dict[str, Any]:
    sessions = load_all_sessions(include_abandoned=False)
    total_pr = 0
    total_fr = 0
    total_ms = 0
    best_cpr_ever = 0
    for s in sessions:
        pr, fr, cpr = session_totals(s)
        total_pr += pr
        total_fr += fr
        total_ms += _session_duration_ms(s)
        best_cpr_ever = max(best_cpr_ever, cpr)
    return {
        "session_count": len(sessions),
        "total_pr": total_pr,
        "total_fr": total_fr,
        "total_training_ms": total_ms,
        "best_cpr_ever": best_cpr_ever,
    }


def personal_bests() -> dict[str, Any]:
    sessions = load_all_sessions(include_abandoned=True)
    best_cpr = 0
    max_pr_session = 0
    longest_session_ms = 0
    for s in sessions:
        best_cpr = max(best_cpr, session_cpr_best(s))
        pr, _, _ = session_totals(s)
        max_pr_session = max(max_pr_session, pr)
        longest_session_ms = max(longest_session_ms, _session_duration_ms(s))
    return {
        "best_cpr_ever": best_cpr,
        "most_pr_single_session": max_pr_session,
        "longest_session_ms": longest_session_ms,
    }


def weekly_aggregates(
    include_abandoned: bool = False,
) -> dict[str, Any]:
    sessions = load_all_sessions(include_abandoned=include_abandoned)
    completed_like = [
        s
        for s in sessions
        if s.status in (SessionStatus.COMPLETED, SessionStatus.ABANDONED, SessionStatus.ACTIVE, SessionStatus.PAUSED, SessionStatus.CREATED)
    ]
    # For trends, attribute session to its start week
    by_week: dict[str, dict[str, float]] = defaultdict(
        lambda: {
            "pr": 0,
            "fr": 0,
            "ms": 0,
            "best_cpr": 0,
            "sessions": 0,
        }
    )
    for s in completed_like:
        wk = _week_key(_session_start_dt(s))
        pr, fr, cpr = session_totals(s)
        by_week[wk]["pr"] += pr
        by_week[wk]["fr"] += fr
        by_week[wk]["ms"] += _session_duration_ms(s)
        by_week[wk]["best_cpr"] = max(by_week[wk]["best_cpr"], cpr)
        by_week[wk]["sessions"] += 1

    labels = sorted(by_week.keys())
    return {
        "labels": labels,
        "pr": [by_week[k]["pr"] for k in labels],
        "fr": [by_week[k]["fr"] for k in labels],
        "hours": [by_week[k]["ms"] / 3600000.0 for k in labels],
        "best_cpr": [by_week[k]["best_cpr"] for k in labels],
        "session_counts": [int(by_week[k]["sessions"]) for k in labels],
    }


def block_failure_counts(include_abandoned: bool = False) -> dict[str, int]:
    sessions = load_all_sessions(include_abandoned=include_abandoned)
    counts: dict[str, int] = defaultdict(int)
    for s in sessions:
        for b in s.blocks:
            key = b.name or "Unnamed"
            counts[key] += b.fr
    return dict(sorted(counts.items(), key=lambda x: -x[1]))
