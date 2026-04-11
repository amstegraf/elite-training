from __future__ import annotations

from app.models import PlanRules, PrecisionSession, RackRecord, SessionRuleOverrides
from app.services.derived_metrics import miss_breaks_run


def effective_rules(plan_rules: PlanRules, overrides: SessionRuleOverrides | None) -> PlanRules:
    if not overrides:
        return plan_rules
    r = plan_rules.model_copy(deep=True)
    if overrides.reset_after_consecutive_misses is not None:
        r.reset_after_consecutive_misses = overrides.reset_after_consecutive_misses
    if overrides.warn_at_consecutive_misses is not None:
        r.warn_at_consecutive_misses = overrides.warn_at_consecutive_misses
    if overrides.rules_enabled is not None:
        r.enabled = overrides.rules_enabled
    return r


def consecutive_misses_on_rack(rack: RackRecord) -> int:
    """Run-breaking events only (outcome: pot miss or no shot position; legacy ``both`` still counts)."""
    return sum(1 for m in rack.misses if miss_breaks_run(m))


def rack_rules_state(rack: RackRecord, rules: PlanRules) -> dict:
    n = consecutive_misses_on_rack(rack)
    warn = (
        rules.enabled
        and rules.warn_at_consecutive_misses > 0
        and n >= rules.warn_at_consecutive_misses
    )
    reset = (
        rules.enabled
        and rules.reset_after_consecutive_misses > 0
        and n >= rules.reset_after_consecutive_misses
    )
    return {
        "consecutiveMisses": n,
        "warn": warn,
        "resetSuggested": reset,
    }


def session_rules_summary(session: PrecisionSession, plan_rules: PlanRules) -> dict:
    rules = effective_rules(plan_rules, session.rule_overrides)
    rack = session.current_rack()
    if not rack:
        return {
            "effectiveRules": rules.model_dump(by_alias=True),
            "consecutiveMisses": 0,
            "warn": False,
            "resetSuggested": False,
        }
    st = rack_rules_state(rack, rules)
    return {
        "effectiveRules": rules.model_dump(by_alias=True),
        **st,
    }


