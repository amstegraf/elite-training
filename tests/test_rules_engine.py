from __future__ import annotations

from app.models import (
    MissEvent,
    MissOutcome,
    MissType,
    PlanRules,
    RackRecord,
    SessionRuleOverrides,
)
from app.services.rules_engine import effective_rules, rack_rules_state


def test_effective_rules_override() -> None:
    base = PlanRules(
        reset_after_consecutive_misses=3,
        warn_at_consecutive_misses=2,
        enabled=True,
    )
    ov = SessionRuleOverrides(
        reset_after_consecutive_misses=5,
        rules_enabled=True,
    )
    r = effective_rules(base, ov)
    assert r.reset_after_consecutive_misses == 5
    assert r.warn_at_consecutive_misses == 2


def test_rack_rules_warn_and_reset() -> None:
    rules = PlanRules(
        reset_after_consecutive_misses=3,
        warn_at_consecutive_misses=2,
        enabled=True,
    )
    rack = RackRecord(rack_number=1, misses=[])
    st0 = rack_rules_state(rack, rules)
    assert st0["consecutiveMisses"] == 0
    assert st0["warn"] is False
    rack.misses.append(
        MissEvent(
            ball_number=1,
            types=[MissType.POSITION],
            outcome=MissOutcome.POT_MISS,
        )
    )
    st1 = rack_rules_state(rack, rules)
    assert st1["consecutiveMisses"] == 1
    assert st1["warn"] is False
    rack.misses.append(
        MissEvent(
            ball_number=1,
            types=[MissType.POSITION],
            outcome=MissOutcome.POT_MISS,
        )
    )
    st2 = rack_rules_state(rack, rules)
    assert st2["warn"] is True
    assert st2["resetSuggested"] is False
    rack.misses.append(
        MissEvent(
            ball_number=1,
            types=[MissType.POSITION],
            outcome=MissOutcome.POT_MISS,
        )
    )
    st3 = rack_rules_state(rack, rules)
    assert st3["resetSuggested"] is True
