from __future__ import annotations

from collections.abc import Iterable

from app.models import PrecisionSession, PrecisionSessionStatus
from app.services.derived_metrics import recompute_session_aggregates


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
