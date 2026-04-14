from __future__ import annotations

from collections import defaultdict
from collections.abc import Sequence

from app.models import MissEvent, MissOutcome, MissType, RackRecord
from app.services.derived_metrics import miss_breaks_run, recompute_rack_balls_cleared

_TYPE_LABEL: dict[MissType, str] = {
    MissType.POSITION: "Position",
    MissType.ALIGNMENT: "Alignment",
    MissType.DELIVERY: "Delivery",
    MissType.SPEED: "Speed",
}

_TYPE_PRIORITY: dict[MissType, int] = {
    MissType.POSITION: 0,
    MissType.ALIGNMENT: 1,
    MissType.DELIVERY: 2,
    MissType.SPEED: 3,
}

_OUTCOME_LABELS: dict[str, str] = {
    "pot_miss": "Pot miss",
    "both": "Pot miss + position (both)",
    "playable": "Playable",
    "no_shot_position": "No shot (position)",
}

def _format_types(types: Sequence[MissType]) -> str:
    if not types:
        return "—"
    seen: set[MissType] = set()
    ordered: list[MissType] = []
    for t in types:
        if t not in seen:
            seen.add(t)
            ordered.append(t)
    ordered.sort(key=lambda t: _TYPE_PRIORITY.get(t, 99))
    return ", ".join(_TYPE_LABEL.get(t, t.value) for t in ordered)


def _overlay_for_misses(misses: list[MissEvent]) -> str:
    """Badge icon key for session report ball cells (matches miss dialog semantics)."""
    if not misses:
        return ""
    if any(miss_breaks_run(m) for m in misses):
        return "hard_x"
    if any(m.outcome == MissOutcome.NO_SHOT_POSITION for m in misses):
        return "no_shot"
    return "playable"


def _unique_types_ordered(misses: list[MissEvent]) -> list[MissType]:
    """Unique miss types across events on this ball, priority order for visuals."""
    seen: set[MissType] = set()
    out: list[MissType] = []
    for m in sorted(misses, key=lambda x: x.created_at):
        for t in m.types:
            if t not in seen:
                seen.add(t)
                out.append(t)
    out.sort(key=lambda t: _TYPE_PRIORITY.get(t, 99))
    return out


def rack_ball_timeline(rack: RackRecord) -> list[dict]:
    """
    Nine cells (balls 1–9) for session report UI.

    State rules:
    - miss_hard / miss_soft if any miss logged on that ball (hard if any breaks run).
    - potted if no miss and balls_cleared is known and ball index <= balls_cleared.
    - unplayed otherwise.
    """
    recompute_rack_balls_cleared(rack)
    bc = rack.balls_cleared

    by_ball: dict[int, list[MissEvent]] = defaultdict(list)
    for m in rack.misses:
        by_ball[m.ball_number].append(m)
    for ball, lst in by_ball.items():
        lst.sort(key=lambda m: m.created_at)

    cells: list[dict] = []
    for i in range(1, 10):
        at = by_ball.get(i, [])
        if at:
            any_hard = any(miss_breaks_run(m) for m in at)
            state = "miss_hard" if any_hard else "miss_soft"
            unique_types = _unique_types_ordered(at)
            extra_type_count = max(0, len(unique_types) - 2)
            tip_events: list[dict] = []
            for m in at:
                hard = miss_breaks_run(m)
                tip_events.append(
                    {
                        "hard": hard,
                        "types": _format_types(m.types),
                        "outcome_label": outcome_label_for_tooltip(m.outcome.value),
                    }
                )
            cells.append(
                {
                    "ball": i,
                    "state": state,
                    "extra_type_count": extra_type_count,
                    "overlay": _overlay_for_misses(at),
                    "tip_events": tip_events,
                }
            )
        elif bc is not None and i <= bc:
            cells.append(
                {
                    "ball": i,
                    "state": "potted",
                    "extra_type_count": 0,
                    "overlay": "",
                    "tip_events": [],
                }
            )
        else:
            cells.append(
                {
                    "ball": i,
                    "state": "unplayed",
                    "extra_type_count": 0,
                    "overlay": "",
                    "tip_events": [],
                }
            )

    return cells


def outcome_label_for_tooltip(outcome_value: str) -> str:
    """Human label for miss outcome line in session report tooltips."""
    return _OUTCOME_LABELS.get(outcome_value, outcome_value.replace("_", " ").title())
