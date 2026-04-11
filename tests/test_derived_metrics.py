from __future__ import annotations

from app.models import MissEvent, MissOutcome, MissType, PrecisionSession, RackRecord
from app.services.derived_metrics import (
    aggregate_sessions_progress,
    best_run_balls_for_rack,
    default_balls_cleared_for_rack,
    miss_breaks_run,
    rack_recovery_counts,
    recompute_session_aggregates,
)


def test_miss_event_strips_legacy_combined_type_and_ignores_confidence() -> None:
    e = MissEvent.model_validate(
        {
            "ballNumber": 2,
            "types": ["position", "combined"],
            "outcome": "playable",
            "confidence": "high",
        }
    )
    assert e.types == [MissType.POSITION]


def test_miss_breaks_run_defaults() -> None:
    assert miss_breaks_run(
        MissEvent(ball_number=1, types=[], outcome=MissOutcome.POT_MISS)
    )
    assert miss_breaks_run(MissEvent(ball_number=1, types=[], outcome=MissOutcome.BOTH))
    assert not miss_breaks_run(
        MissEvent(ball_number=1, types=[], outcome=MissOutcome.NO_SHOT_POSITION)
    )
    assert not miss_breaks_run(
        MissEvent(ball_number=1, types=[], outcome=MissOutcome.PLAYABLE)
    )
    assert not miss_breaks_run(
        MissEvent(
            ball_number=1,
            types=[],
            outcome=MissOutcome.PLAYABLE,
            ends_run=True,
        )
    )
    assert miss_breaks_run(
        MissEvent(
            ball_number=1,
            types=[],
            outcome=MissOutcome.POT_MISS,
            ends_run=False,
        )
    )


def test_default_balls_cleared_no_misses() -> None:
    r = RackRecord(rack_number=1, misses=[])
    assert default_balls_cleared_for_rack(r) == 9


def test_default_balls_cleared_playable_only_returns_none() -> None:
    r = RackRecord(
        rack_number=1,
        misses=[
            MissEvent(
                ball_number=3,
                types=[MissType.POSITION],
                outcome=MissOutcome.PLAYABLE,
            )
        ],
    )
    assert default_balls_cleared_for_rack(r) is None


def test_default_balls_cleared_no_shot_only_returns_none() -> None:
    """No-shot alone does not break the run, so balls cleared cannot be inferred from it."""
    r = RackRecord(
        rack_number=1,
        misses=[
            MissEvent(
                ball_number=3,
                types=[MissType.POSITION],
                outcome=MissOutcome.NO_SHOT_POSITION,
            )
        ],
    )
    assert default_balls_cleared_for_rack(r) is None


def test_default_balls_cleared_first_pot_miss_ball_5() -> None:
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


def test_best_run_no_shot_only_uses_balls_cleared() -> None:
    """Rack with soft no-shot logs only: best run follows explicit balls cleared."""
    r = RackRecord(
        rack_number=2,
        balls_cleared=9,
        misses=[
            MissEvent(
                ball_number=4,
                types=[MissType.POSITION, MissType.SPEED],
                outcome=MissOutcome.NO_SHOT_POSITION,
            )
        ],
    )
    assert best_run_balls_for_rack(r) == 9


def test_best_run_pot_miss_segments() -> None:
    r = RackRecord(
        rack_number=1,
        misses=[
            MissEvent(ball_number=3, types=[MissType.POSITION], outcome=MissOutcome.POT_MISS),
            MissEvent(ball_number=7, types=[MissType.ALIGNMENT], outcome=MissOutcome.POT_MISS),
        ],
    )
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
    assert s.true_miss_count == 1
    assert s.training_miss_count == 0
    assert s.total_balls_cleared == 1
    assert s.conversion_efficiency == 1.0
    assert s.true_miss_rate == 1.0
    assert s.racks_completed == 0
    assert s.rack_conversion_rate == 0.0
    assert s.pot_miss_shot_count == 1
    assert s.pot_attempts == 2
    assert s.pot_success_rate == 0.5
    assert s.position_related_miss_count == 1
    assert s.position_success_rate == 0.0
    assert s.worst_rack_balls_cleared == 1
    assert s.best_rack_balls_cleared == 1
    assert s.miss_type_counts.position == 1
    assert s.no_shot_position_count == 0


def test_recompute_soft_vs_true_example_session_shape() -> None:
    """Regression: mixed soft + one pot miss → one true miss, best run from soft rack = bc."""
    from app.models import PrecisionSessionStatus, SessionMode, TableType

    r2 = RackRecord(
        rack_number=2,
        ended_at="2026-01-01T00:00:00+00:00",
        balls_cleared=9,
        misses=[
            MissEvent(
                ball_number=4,
                types=[MissType.POSITION],
                outcome=MissOutcome.NO_SHOT_POSITION,
            )
        ],
    )
    r4 = RackRecord(
        rack_number=4,
        ended_at="2026-01-01T00:00:00+00:00",
        balls_cleared=6,
        misses=[
            MissEvent(
                ball_number=3,
                types=[MissType.POSITION],
                outcome=MissOutcome.PLAYABLE,
            ),
            MissEvent(
                ball_number=7,
                types=[MissType.ALIGNMENT],
                outcome=MissOutcome.POT_MISS,
            ),
        ],
    )
    s = PrecisionSession(
        id="s2",
        program_id="p1",
        plan_id="pl1",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        racks=[r2, r4],
    )
    recompute_session_aggregates(s)
    assert s.best_run_balls == 9
    assert s.true_miss_count == 1
    assert s.training_miss_count == 2
    assert s.avg_balls_before_true_miss == 6.0
    assert s.total_balls_cleared == 15
    assert s.conversion_efficiency is not None
    assert s.conversion_efficiency == round(15 / 17, 4)
    assert s.true_miss_rate == round(1 / 2, 4)
    assert s.racks_completed == 1
    assert s.rack_conversion_rate == 0.5
    assert s.pot_miss_shot_count == 1
    assert s.pot_attempts == 16
    assert s.pot_success_rate == round(15 / 16, 4)
    assert s.position_related_miss_count == 2
    assert s.position_success_rate == round(1 - 2 / 15, 4)
    assert s.worst_rack_balls_cleared == 6
    assert s.best_rack_balls_cleared == 9


def test_rack_recovery_training_then_true_is_failed() -> None:
    r = RackRecord(
        rack_number=1,
        misses=[
            MissEvent(
                ball_number=3,
                types=[],
                outcome=MissOutcome.PLAYABLE,
                created_at="2026-01-01T00:00:01+00:00",
            ),
            MissEvent(
                ball_number=7,
                types=[],
                outcome=MissOutcome.POT_MISS,
                created_at="2026-01-01T00:00:02+00:00",
            ),
        ],
    )
    ok, fail = rack_recovery_counts(r)
    assert ok == 0 and fail == 1


def test_rack_recovery_training_chain_then_end() -> None:
    r = RackRecord(
        rack_number=1,
        misses=[
            MissEvent(ball_number=1, types=[], outcome=MissOutcome.NO_SHOT_POSITION, created_at="2026-01-01T00:00:01+00:00"),
            MissEvent(ball_number=3, types=[], outcome=MissOutcome.PLAYABLE, created_at="2026-01-01T00:00:02+00:00"),
            MissEvent(ball_number=5, types=[], outcome=MissOutcome.NO_SHOT_POSITION, created_at="2026-01-01T00:00:03+00:00"),
        ],
    )
    ok, fail = rack_recovery_counts(r)
    assert ok == 3 and fail == 0


def test_session_recovery_invariant() -> None:
    from app.models import PrecisionSessionStatus, SessionMode, TableType

    r4 = RackRecord(
        rack_number=4,
        ended_at="2026-01-01T00:00:00+00:00",
        balls_cleared=6,
        misses=[
            MissEvent(ball_number=3, types=[], outcome=MissOutcome.PLAYABLE, created_at="2026-01-01T00:00:01+00:00"),
            MissEvent(ball_number=7, types=[], outcome=MissOutcome.POT_MISS, created_at="2026-01-01T00:00:02+00:00"),
        ],
    )
    s = PrecisionSession(
        id="rec",
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        racks=[r4],
    )
    recompute_session_aggregates(s)
    assert s.training_miss_count == 1
    assert s.recovery_count + s.failed_recovery_count == s.training_miss_count
    assert s.failed_recovery_count == 1
    assert s.recovery_rate == 0.0


def test_aggregate_progress_recomputes_stale_session_fields() -> None:
    """Progress must not trust stale JSON aggregates; recompute from racks."""
    from app.models import PrecisionSessionStatus, SessionMode, TableType

    r = RackRecord(
        rack_number=2,
        ended_at="2026-01-01T00:00:00+00:00",
        balls_cleared=9,
        misses=[
            MissEvent(
                ball_number=4,
                types=[MissType.POSITION],
                outcome=MissOutcome.NO_SHOT_POSITION,
            )
        ],
    )
    s = PrecisionSession(
        id="stale",
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        racks=[r],
        best_run_balls=2,
        true_miss_count=99,
        training_miss_count=0,
        total_racks=0,
    )
    out = aggregate_sessions_progress([s])
    assert out["labels"]
    assert out["best_runs"] == [9]
    assert out["true_misses_per_rack"] == [0.0]
    assert out["training_logs_per_rack"] == [1.0]
