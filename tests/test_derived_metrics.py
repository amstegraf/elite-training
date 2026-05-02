from __future__ import annotations

from app.models import MissEvent, MissOutcome, MissType, PrecisionSession, RackRecord
from app.services.derived_metrics import (
    aggregate_sessions_progress,
    best_run_balls_for_rack,
    dashboard_metric_trend,
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


def test_position_outcome_includes_speed_tag() -> None:
    """Speed tags count toward position-related misses (same as position tags after no-shot rule)."""
    from app.models import PrecisionSessionStatus, SessionMode, TableType

    rack = RackRecord(
        rack_number=1,
        ended_at="2026-01-01T00:00:00+00:00",
        balls_cleared=4,
        misses=[
            MissEvent(
                ball_number=2,
                types=[MissType.SPEED],
                outcome=MissOutcome.PLAYABLE,
            ),
        ],
    )
    s = PrecisionSession(
        id="s-speed",
        program_id="p1",
        plan_id="pl1",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        racks=[rack],
    )
    recompute_session_aggregates(s)
    assert s.position_related_miss_count == 1
    assert s.position_success_rate == round(1 - 1 / 4, 4)


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


def test_aggregate_progress_avg_balls_null_when_racks_lack_cleared_counts() -> None:
    """Do not substitute 0 for unknown avg balls/rack — matches session report (—)."""
    from app.models import PrecisionSessionStatus, SessionMode, TableType

    r = RackRecord(
        rack_number=1,
        ended_at="2026-01-01T12:00:00+00:00",
        balls_cleared=None,
        misses=[
            MissEvent(
                ball_number=3,
                types=[MissType.POSITION],
                outcome=MissOutcome.PLAYABLE,
                created_at="2026-01-01T12:00:01+00:00",
            ),
        ],
    )
    s = PrecisionSession(
        id="no-bc",
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        racks=[r],
    )
    recompute_session_aggregates(s)
    assert s.avg_balls_cleared_per_rack is None

    out = aggregate_sessions_progress([s])
    assert out["avg_balls_cleared"] == [None]
    assert out["avg_rack_balls"] == [None]


def test_aggregate_position_speed_pct_of_bad_play() -> None:
    from app.models import PrecisionSessionStatus, SessionMode, TableType

    r = RackRecord(
        rack_number=1,
        ended_at="2026-01-01T00:00:00+00:00",
        balls_cleared=9,
        misses=[
            MissEvent(
                ball_number=2,
                types=[MissType.POSITION],
                outcome=MissOutcome.PLAYABLE,
            ),
            MissEvent(
                ball_number=3,
                types=[MissType.SPEED],
                outcome=MissOutcome.PLAYABLE,
            ),
        ],
    )
    s = PrecisionSession(
        id="pct-bad",
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        racks=[r],
    )
    out = aggregate_sessions_progress([s])
    assert out["position_tag_pct_of_bad_play"] == [50.0]
    assert out["speed_tag_pct_of_bad_play"] == [50.0]


def test_dashboard_metric_trend_pot_increasing() -> None:
    from app.models import PrecisionSessionStatus, SessionMode, TableType

    def sess(day: int, bc: int, pot_miss: bool) -> PrecisionSession:
        misses = []
        if pot_miss:
            misses.append(
                MissEvent(
                    ball_number=bc + 1,
                    types=[],
                    outcome=MissOutcome.POT_MISS,
                )
            )
        r = RackRecord(
            rack_number=1,
            ended_at=f"2026-01-{day:02d}T12:00:00+00:00",
            balls_cleared=bc,
            misses=misses,
        )
        return PrecisionSession(
            id=f"s{day}",
            program_id="p",
            plan_id="pl",
            table_type=TableType.EIGHT_FT,
            mode=SessionMode.RACK,
            status=PrecisionSessionStatus.COMPLETED,
            started_at=f"2026-01-{day:02d}T00:00:00+00:00",
            racks=[r],
        )

    s1 = sess(1, 7, True)
    s2 = sess(2, 8, True)
    s3 = sess(3, 9, False)
    assert dashboard_metric_trend([s3, s2, s1], metric="pot") == "up"


def test_dashboard_metric_trend_single_session_is_flat() -> None:
    from app.models import PrecisionSessionStatus, SessionMode, TableType

    r = RackRecord(
        rack_number=1,
        ended_at="2026-01-05T12:00:00+00:00",
        balls_cleared=9,
        misses=[],
    )
    s = PrecisionSession(
        id="one",
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        racks=[r],
    )
    assert dashboard_metric_trend([s], metric="pot") == "flat"


def test_dashboard_global_progress_vs_30_day_baseline() -> None:
    from datetime import datetime, timezone

    from app.models import PrecisionSessionStatus, SessionMode, TableType
    from app.services.derived_metrics import dashboard_global_progress_vs_baseline

    now = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)

    r_old = RackRecord(
        rack_number=1,
        ended_at="2026-04-01T12:00:00+00:00",
        balls_cleared=9,
        misses=[],
    )
    s_old = PrecisionSession(
        id="old",
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        started_at="2026-04-01T10:00:00+00:00",
        racks=[r_old],
    )
    r_new = RackRecord(
        rack_number=1,
        ended_at="2026-06-10T12:00:00+00:00",
        balls_cleared=9,
        misses=[
            MissEvent(ball_number=2, types=[MissType.POSITION], outcome=MissOutcome.POT_MISS)
        ],
    )
    s_new = PrecisionSession(
        id="new",
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        started_at="2026-06-10T10:00:00+00:00",
        racks=[r_new],
    )

    out = dashboard_global_progress_vs_baseline([s_new, s_old], now=now)
    assert out["caption"] == "last 30 days"
    assert out["pot"]["dir"] == "down"
    assert out["pot"]["label"] == "-5.3%"


def test_dashboard_global_progress_falls_back_to_earliest_session() -> None:
    from datetime import datetime, timezone

    from app.models import PrecisionSessionStatus, SessionMode, TableType
    from app.services.derived_metrics import dashboard_global_progress_vs_baseline

    now = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)

    r1 = RackRecord(
        rack_number=1,
        ended_at="2026-06-10T12:00:00+00:00",
        balls_cleared=9,
        misses=[],
    )
    s1 = PrecisionSession(
        id="a",
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        started_at="2026-06-10T10:00:00+00:00",
        racks=[r1],
    )
    r2 = RackRecord(
        rack_number=1,
        ended_at="2026-06-12T12:00:00+00:00",
        balls_cleared=9,
        misses=[
            MissEvent(ball_number=2, types=[MissType.POSITION], outcome=MissOutcome.POT_MISS)
        ],
    )
    s2 = PrecisionSession(
        id="b",
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        started_at="2026-06-12T10:00:00+00:00",
        racks=[r2],
    )

    out = dashboard_global_progress_vs_baseline([s2, s1], now=now)
    assert out["caption"] == "earliest session"
    assert out["pot"]["dir"] == "down"
    assert out["pot"]["label"] == "-5.3%"
