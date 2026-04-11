from __future__ import annotations

from app.models import MissEvent, MissOutcome, MissType, PrecisionSession, RackRecord
from app.services.derived_metrics import (
    best_run_balls_for_rack,
    default_balls_cleared_for_rack,
    recompute_session_aggregates,
)


def test_default_balls_cleared_no_misses() -> None:
    r = RackRecord(rack_number=1, misses=[])
    assert default_balls_cleared_for_rack(r) == 9


def test_default_balls_cleared_first_miss_ball_5() -> None:
    r = RackRecord(
        rack_number=1,
        misses=[
            MissEvent(ball_number=5, types=[MissType.POSITION], outcome=MissOutcome.POT_MISS)
        ],
    )
    assert default_balls_cleared_for_rack(r) == 4


def test_best_run_clean_rack() -> None:
    r = RackRecord(rack_number=1, misses=[], balls_cleared=9)
    assert best_run_balls_for_rack(r) == 9


def test_best_run_misses_segments() -> None:
    r = RackRecord(
        rack_number=1,
        misses=[
            MissEvent(ball_number=3, types=[MissType.POSITION], outcome=MissOutcome.POT_MISS),
            MissEvent(ball_number=7, types=[MissType.ALIGNMENT], outcome=MissOutcome.POT_MISS),
        ],
    )
    # streaks: 2 before first miss, 3 between 3 and 7, 2 after 7 -> best 3
    assert best_run_balls_for_rack(r) == 3


def test_recompute_session_totals() -> None:
    from app.models import PrecisionSessionStatus, SessionMode, TableType

    rack1 = RackRecord(
        rack_number=1,
        ended_at="2026-01-01T00:00:00+00:00",
        misses=[
            MissEvent(ball_number=2, types=[MissType.POSITION], outcome=MissOutcome.POT_MISS)
        ],
    )
    rack1.balls_cleared = default_balls_cleared_for_rack(rack1)
    s = PrecisionSession(
        id="s1",
        program_id="p1",
        plan_id="pl1",
        table_type=TableType.NINE_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        racks=[rack1],
    )
    recompute_session_aggregates(s)
    assert s.total_racks == 1
    assert s.total_misses == 1
    assert s.miss_type_counts.position == 1
    assert s.no_shot_position_count == 0
