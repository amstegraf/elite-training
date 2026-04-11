from __future__ import annotations

from collections.abc import Iterable

from app.models import PrecisionSession, PrecisionSessionStatus
from app.services.derived_metrics import recompute_session_aggregates


def rack_conversion_tier_label(rate: float | None) -> str | None:
    """
    Tier label from aggregate rack conversion (0–1), using overall % thresholds:

    <20% inconsistent / developing · 20–35% strong amateur · 35–50% advanced ·
    50–65% semi-pro · 65%+ elite.
    """
    if rate is None:
        return None
    pct = rate * 100.0
    if pct < 20:
        return "Inconsistent / developing"
    if pct < 35:
        return "Strong amateur"
    if pct < 50:
        return "Advanced"
    if pct < 65:
        return "Semi-pro"
    return "Elite"


def overall_rack_conversion_breakdown(
    sessions: Iterable[PrecisionSession],
) -> tuple[float | None, int, int]:
    """Returns (weighted_rate_0_1, racks_completed_sum, total_ended_racks_sum)."""
    rc = 0
    tr = 0
    for s in sessions:
        if s.status != PrecisionSessionStatus.COMPLETED:
            continue
        recompute_session_aggregates(s)
        if s.total_racks <= 0:
            continue
        rc += s.racks_completed
        tr += s.total_racks
    if tr == 0:
        return None, 0, 0
    return round(rc / tr, 4), rc, tr
