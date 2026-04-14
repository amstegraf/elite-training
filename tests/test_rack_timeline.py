from __future__ import annotations

from app.models import MissEvent, MissOutcome, MissType, RackRecord
from app.services.rack_timeline import outcome_label_for_tooltip, rack_ball_timeline


def test_clean_rack_nine_potted() -> None:
    r = RackRecord(rack_number=1, ended_at="2026-01-01T00:00:00+00:00", balls_cleared=9, misses=[])
    cells = rack_ball_timeline(r)
    assert len(cells) == 9
    assert all(c["state"] == "potted" for c in cells)
    assert all(c["tip_events"] == [] for c in cells)


def test_pot_miss_ball_5_potted_before_unplayed_after() -> None:
    r = RackRecord(
        rack_number=1,
        ended_at="2026-01-01T00:00:00+00:00",
        misses=[
            MissEvent(ball_number=5, types=[MissType.POSITION], outcome=MissOutcome.POT_MISS)
        ],
    )
    cells = rack_ball_timeline(r)
    assert cells[0]["state"] == "potted"
    assert cells[3]["state"] == "potted"
    assert cells[4]["state"] == "miss_hard"
    assert cells[4]["overlay"] == "hard_x"
    assert cells[4]["tip_events"][0]["hard"] is True
    assert cells[4]["tip_events"][0]["outcome_label"] == "Pot miss"
    for j in range(5, 9):
        assert cells[j]["state"] == "unplayed"


def test_soft_only_ball_4_rest_potted() -> None:
    r = RackRecord(
        rack_number=2,
        ended_at="2026-01-01T00:00:00+00:00",
        balls_cleared=9,
        misses=[
            MissEvent(
                ball_number=4,
                types=[MissType.POSITION, MissType.SPEED],
                outcome=MissOutcome.NO_SHOT_POSITION,
            )
        ],
    )
    cells = rack_ball_timeline(r)
    assert cells[3]["state"] == "miss_soft"
    assert cells[3]["overlay"] == "no_shot"
    assert cells[3]["tip_events"][0]["hard"] is False
    assert cells[3]["tip_events"][0]["outcome_label"] == "No shot (position)"
    assert "Position" in cells[3]["tip_events"][0]["types"]
    assert "Speed" in cells[3]["tip_events"][0]["types"]
    assert cells[0]["state"] == "potted"
    assert cells[8]["state"] == "potted"


def test_outcome_label_both() -> None:
    assert "Pot" in outcome_label_for_tooltip("both")


def test_outcome_label_playable() -> None:
    assert outcome_label_for_tooltip("playable") == "Playable"


def test_soft_playable_overlay() -> None:
    r = RackRecord(
        rack_number=1,
        ended_at="2026-01-01T00:00:00+00:00",
        balls_cleared=9,
        misses=[
            MissEvent(
                ball_number=2,
                types=[MissType.DELIVERY],
                outcome=MissOutcome.PLAYABLE,
            )
        ],
    )
    cells = rack_ball_timeline(r)
    assert cells[1]["overlay"] == "playable"
    assert cells[1]["tip_events"][0]["outcome_label"] == "Playable"


def test_open_rack_explicit_bc() -> None:
    r = RackRecord(
        rack_number=1,
        started_at="2026-01-01T00:00:00+00:00",
        ended_at=None,
        balls_cleared=3,
        misses=[],
    )
    cells = rack_ball_timeline(r)
    assert cells[0]["state"] == "potted"
    assert cells[2]["state"] == "potted"
    assert all(c["state"] == "unplayed" for c in cells[3:])
