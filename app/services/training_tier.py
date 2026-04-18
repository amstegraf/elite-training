from __future__ import annotations

import math
from typing import Any

from app.models import TIER_LABELS, TierSettings
from app.services.tier_settings_store import load_tier_settings

MAX_TIER_POINTS = 10_000
_ELITE_ENTRY_REMAINDER_FRACTION = 0.6


def kpi_score_from_pct_continuous(
    pct: float, lower_bounds: tuple[float, float, float, float]
) -> float:
    """
    Continuous KPI score in [0, 4].

    Score anchors are:
    - score 1 at b0
    - score 2 at b1
    - score 3 at b2
    - score 3.5 at b3 (Semi-pro minimum)
    - score 4 at 100%

    Between anchors, score moves linearly. For values below b0, score moves from 0 up to
    (but not including) 1.
    """
    b0, b1, b2, b3 = lower_bounds
    x = float(pct)
    if x < b0:
        if b0 <= 0:
            return 0.0
        return max(0.0, min(1.0, x / b0))
    if x < b1:
        return 1.0 + (x - b0) / (b1 - b0)
    if x < b2:
        return 2.0 + (x - b1) / (b2 - b1)
    if x < b3:
        span = b3 - b2
        if span <= 1e-9:
            return 3.5
        return 3.0 + 0.5 * ((x - b2) / span)
    top_anchor = max(100.0, b3)
    if x < top_anchor:
        span = top_anchor - b3
        if span <= 1e-9:
            return 4.0
        return 3.5 + 0.5 * ((x - b3) / span)
    return 4.0


def composite_score(
    pos_score: float,
    conv_score: float,
    pot_score: float,
    settings: TierSettings,
) -> float:
    return (
        pos_score * settings.weight_pos
        + conv_score * settings.weight_conv
        + pot_score * settings.weight_pot
    )


def imbalance_penalty_adjusted_composite(
    *,
    pos_score: float,
    conv_score: float,
    pot_score: float,
    base_composite: float,
    settings: TierSettings,
) -> tuple[float, float, float]:
    """
    Apply KPI-imbalance penalty to composite:
    imbalance = max(score) - min(score)
    penalty = imbalance * penalty_factor
    adjusted = clamp(base - penalty, 0, 4)
    """
    max_score = max(pos_score, conv_score, pot_score)
    min_score = min(pos_score, conv_score, pot_score)
    imbalance = max_score - min_score
    penalty = imbalance * settings.penalty_factor
    adjusted = max(0.0, min(4.0, base_composite - penalty))
    return adjusted, imbalance, penalty


def tier_points_from_composite(composite: float, settings: TierSettings) -> float:
    _ = settings
    c = max(0.0, min(4.0, float(composite)))
    return (c / 4.0) * float(MAX_TIER_POINTS)


def tier_point_cuts(settings: TierSettings) -> tuple[int, int, int, int, int]:
    """Auto-derive fixed cuts from configured percentage baselines."""
    minima_points: list[int] = []
    for idx in range(4):
        ps = kpi_score_from_pct_continuous(
            settings.pot_pct_lower_bounds[idx], settings.pot_pct_lower_bounds
        )
        xs = kpi_score_from_pct_continuous(
            settings.pos_pct_lower_bounds[idx], settings.pos_pct_lower_bounds
        )
        cs = kpi_score_from_pct_continuous(
            settings.conv_pct_lower_bounds[idx], settings.conv_pct_lower_bounds
        )
        base = composite_score(xs, cs, ps, settings)
        adjusted, _imbalance, _penalty = imbalance_penalty_adjusted_composite(
            pos_score=xs,
            conv_score=cs,
            pot_score=ps,
            base_composite=base,
            settings=settings,
        )
        minima_points.append(int(round(tier_points_from_composite(adjusted, settings))))

    # Force strict ascending cuts, even with unusual user configs.
    strict: list[int] = []
    prev = 0
    for raw in minima_points:
        v = max(raw, prev + 1)
        v = min(v, MAX_TIER_POINTS - (4 - len(strict)))
        strict.append(v)
        prev = v

    semi_cut = strict[3]
    elite_cut = int(
        round(semi_cut + (MAX_TIER_POINTS - semi_cut) * _ELITE_ENTRY_REMAINDER_FRACTION)
    )
    elite_cut = max(semi_cut + 1, min(elite_cut, MAX_TIER_POINTS - 1))
    return strict[0], strict[1], strict[2], strict[3], elite_cut


def tier_index_from_tier_points(tier_points: float, settings: TierSettings) -> int:
    bounds = tier_point_cuts(settings)
    for i, hi in enumerate(bounds):
        if tier_points < hi:
            return i
    return len(bounds)


def max_tier_points(settings: TierSettings) -> int:
    _ = settings
    return MAX_TIER_POINTS


def threshold_gate_tier_index(
    *, pot_pct: float, pos_pct: float, conv_pct: float, settings: TierSettings
) -> int:
    """
    Hard KPI minimum gate for semantic tier label:
    - Beginner: below any Amateur minima
    - Amateur: meets b0 minima on all KPIs
    - Strong Amateur: meets b1 minima on all KPIs
    - Advanced: meets b2 minima on all KPIs
    - Semi-pro: meets b3 minima on all KPIs
    """
    pb = settings.pot_pct_lower_bounds
    xb = settings.pos_pct_lower_bounds
    cb = settings.conv_pct_lower_bounds
    if pot_pct >= pb[3] and pos_pct >= xb[3] and conv_pct >= cb[3]:
        return 4
    if pot_pct >= pb[2] and pos_pct >= xb[2] and conv_pct >= cb[2]:
        return 3
    if pot_pct >= pb[1] and pos_pct >= xb[1] and conv_pct >= cb[1]:
        return 2
    if pot_pct >= pb[0] and pos_pct >= xb[0] and conv_pct >= cb[0]:
        return 1
    return 0


def semantic_tier_index_with_threshold_gate(
    *, points_tier_index: int, gate_tier_index: int
) -> int:
    # Elite is allowed only if Semi-pro minima are met (gate==4) and points place user in Elite.
    if points_tier_index >= len(TIER_LABELS) - 1 and gate_tier_index >= len(TIER_LABELS) - 2:
        return len(TIER_LABELS) - 1
    return min(points_tier_index, gate_tier_index)


def _resolve_training_tier(
    pot_rate: float | None,
    pos_rate: float | None,
    conv_rate: float | None,
    *,
    settings: TierSettings | None,
) -> tuple[TierSettings, float, int, float, float, float, float, float, float] | None:
    if pot_rate is None or pos_rate is None or conv_rate is None:
        return None
    cfg = settings if settings is not None else load_tier_settings()
    pot_pct = pot_rate * 100.0
    pos_pct = pos_rate * 100.0
    conv_pct = conv_rate * 100.0
    ps = kpi_score_from_pct_continuous(pot_pct, cfg.pot_pct_lower_bounds)
    xs = kpi_score_from_pct_continuous(pos_pct, cfg.pos_pct_lower_bounds)
    cs = kpi_score_from_pct_continuous(conv_pct, cfg.conv_pct_lower_bounds)
    base_comp = composite_score(xs, cs, ps, cfg)
    comp, imbalance, penalty = imbalance_penalty_adjusted_composite(
        pos_score=xs,
        conv_score=cs,
        pot_score=ps,
        base_composite=base_comp,
        settings=cfg,
    )
    tp = tier_points_from_composite(comp, cfg)
    idx = tier_index_from_tier_points(tp, cfg)
    return cfg, comp, idx, base_comp, imbalance, penalty, pot_pct, pos_pct, conv_pct


def training_tier_label(
    pot_rate: float | None,
    pos_rate: float | None,
    conv_rate: float | None,
    *,
    settings: TierSettings | None = None,
) -> str | None:
    """
    Matrix tier from docs/matrix-calculation-of-tier.md using POT, POS, CONV (each 0–1).
    Returns None if any input rate is missing.
    """
    resolved = _resolve_training_tier(pot_rate, pos_rate, conv_rate, settings=settings)
    if resolved is None:
        return None
    cfg, _comp, idx, _base_comp, _imbalance, _penalty, pot_pct, pos_pct, conv_pct = resolved
    gate_idx = threshold_gate_tier_index(
        pot_pct=pot_pct, pos_pct=pos_pct, conv_pct=conv_pct, settings=cfg
    )
    effective_idx = semantic_tier_index_with_threshold_gate(
        points_tier_index=idx, gate_tier_index=gate_idx
    )
    return TIER_LABELS[effective_idx]


def training_tier_dashboard_meta(
    pot_rate: float | None,
    pos_rate: float | None,
    conv_rate: float | None,
    *,
    settings: TierSettings | None = None,
) -> dict[str, Any] | None:
    """Adjusted tier points/meta (after imbalance penalty), progress, and gap to next cut."""
    resolved = _resolve_training_tier(pot_rate, pos_rate, conv_rate, settings=settings)
    if resolved is None:
        return None
    cfg, comp, idx, base_comp, imbalance, penalty, pot_pct, pos_pct, conv_pct = resolved
    raw_tp = tier_points_from_composite(comp, cfg)
    points_idx = idx
    cuts = tier_point_cuts(cfg)
    gate_idx = threshold_gate_tier_index(
        pot_pct=pot_pct, pos_pct=pos_pct, conv_pct=conv_pct, settings=cfg
    )
    effective_idx = semantic_tier_index_with_threshold_gate(
        points_tier_index=points_idx, gate_tier_index=gate_idx
    )
    tp = raw_tp
    if effective_idx < len(TIER_LABELS) - 1:
        tp = min(tp, float(cuts[effective_idx]) - 1e-6)
    tier_pts = int(round(tp))
    ceiling = float(max_tier_points(cfg))
    lo_pt = 0.0 if effective_idx == 0 else float(cuts[effective_idx - 1])

    if effective_idx >= len(TIER_LABELS) - 1:
        hi_pt = ceiling
        span = hi_pt - lo_pt
        pct = (
            max(0.0, min(100.0, ((tp - lo_pt) / span) * 100.0)) if span > 0 else 100.0
        )
        return {
            "composite": round(comp, 4),
            "base_composite": round(base_comp, 4),
            "imbalance": round(imbalance, 4),
            "penalty": round(penalty, 4),
            "tier_points": min(MAX_TIER_POINTS, tier_pts),
            "points_to_next": None,
            "next_tier_label": None,
            "progress_pct": round(pct, 1),
            "band_lo_pts": int(round(lo_pt)),
            "band_hi_pts": int(ceiling),
        }

    hi_pt = float(cuts[effective_idx])
    # Keep visible points strictly within current non-elite band.
    tier_pts = min(int(tp), int(hi_pt) - 1)
    span = hi_pt - lo_pt
    pct = max(0.0, min(100.0, ((tp - lo_pt) / span) * 100.0)) if span > 0 else 100.0
    # Never display a zero gap unless the tier actually advanced.
    gap_pts = max(1, int(math.ceil(hi_pt - tp)))
    next_label = TIER_LABELS[effective_idx + 1]

    return {
        "composite": round(comp, 4),
        "base_composite": round(base_comp, 4),
        "imbalance": round(imbalance, 4),
        "penalty": round(penalty, 4),
        "tier_points": tier_pts,
        "points_to_next": gap_pts,
        "next_tier_label": next_label,
        "progress_pct": round(pct, 1),
        "band_lo_pts": int(round(lo_pt)),
        "band_hi_pts": int(round(hi_pt)),
    }


def kpi_score_bands_for_display(
    name: str,
    lower_bounds: tuple[float, float, float, float],
) -> list[dict[str, str | int]]:
    """Rows for settings UI: score, human-readable percent band."""
    b0, b1, b2, b3 = lower_bounds
    return [
        {"kpi": name, "score": 0, "band": f"under {b0:g}%"},
        {"kpi": name, "score": 1, "band": f"{b0:g}% up to (not including) {b1:g}%"},
        {"kpi": name, "score": 2, "band": f"{b1:g}% up to (not including) {b2:g}%"},
        {"kpi": name, "score": 3, "band": f"{b2:g}% up to (not including) {b3:g}%"},
        {"kpi": name, "score": 4, "band": f"{b3:g}% and above"},
    ]


def composite_tier_bands_for_display(settings: TierSettings) -> list[dict[str, str | float | int | None]]:
    """Rows: tier label, tier-points interval (exclusive upper for lower tiers)."""
    cuts = tier_point_cuts(settings)
    ceiling = max_tier_points(settings)
    out: list[dict[str, str | float | int | None]] = []
    lo = 0
    for i, label in enumerate(TIER_LABELS):
        if i < len(cuts):
            hi = cuts[i]
            out.append(
                {
                    "label": label,
                    "min_inclusive": lo,
                    "max_exclusive": hi,
                    "range_summary": f"{lo} ≤ tier pts < {hi}",
                }
            )
            lo = hi
        else:
            out.append(
                {
                    "label": label,
                    "min_inclusive": lo,
                    "max_exclusive": None,
                    "range_summary": f"{lo} ≤ tier pts ≤ {ceiling}",
                }
            )
    return out
