from __future__ import annotations

from typing import Any

from app.models import TIER_LABELS, TierSettings
from app.services.tier_settings_store import load_tier_settings


def kpi_score_from_pct(pct: float, lower_bounds: tuple[float, float, float, float]) -> int:
    """Discrete score 0–4 from a KPI percentage and four ascending lower bounds."""
    b0, b1, b2, b3 = lower_bounds
    if pct < b0:
        return 0
    if pct < b1:
        return 1
    if pct < b2:
        return 2
    if pct < b3:
        return 3
    return 4


def composite_score(
    pos_score: int,
    conv_score: int,
    pot_score: int,
    settings: TierSettings,
) -> float:
    return (
        pos_score * settings.weight_pos
        + conv_score * settings.weight_conv
        + pot_score * settings.weight_pot
    )


def tier_points_from_composite(composite: float, settings: TierSettings) -> float:
    return composite * float(settings.composite_points_scale)


def tier_index_from_tier_points(tier_points: float, settings: TierSettings) -> int:
    bounds = settings.composite_points_upper_bounds
    for i, hi in enumerate(bounds):
        if tier_points < hi:
            return i
    return len(bounds)


def max_tier_points(settings: TierSettings) -> int:
    return settings.composite_points_scale * 4


def _resolve_training_tier(
    pot_rate: float | None,
    pos_rate: float | None,
    conv_rate: float | None,
    *,
    settings: TierSettings | None,
) -> tuple[TierSettings, float, int] | None:
    if pot_rate is None or pos_rate is None or conv_rate is None:
        return None
    cfg = settings if settings is not None else load_tier_settings()
    pot_pct = pot_rate * 100.0
    pos_pct = pos_rate * 100.0
    conv_pct = conv_rate * 100.0
    ps = kpi_score_from_pct(pot_pct, cfg.pot_pct_lower_bounds)
    xs = kpi_score_from_pct(pos_pct, cfg.pos_pct_lower_bounds)
    cs = kpi_score_from_pct(conv_pct, cfg.conv_pct_lower_bounds)
    comp = composite_score(xs, cs, ps, cfg)
    tp = tier_points_from_composite(comp, cfg)
    idx = tier_index_from_tier_points(tp, cfg)
    return cfg, comp, idx


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
    return TIER_LABELS[resolved[2]]


def training_tier_dashboard_meta(
    pot_rate: float | None,
    pos_rate: float | None,
    conv_rate: float | None,
    *,
    settings: TierSettings | None = None,
) -> dict[str, Any] | None:
    """Tier points (0–4×scale), progress within current band, gap to next cut (points)."""
    resolved = _resolve_training_tier(pot_rate, pos_rate, conv_rate, settings=settings)
    if resolved is None:
        return None
    cfg, comp, idx = resolved
    scale = cfg.composite_points_scale
    tp = tier_points_from_composite(comp, cfg)
    tier_pts = int(round(tp))
    ceiling = float(max_tier_points(cfg))

    bounds = cfg.composite_points_upper_bounds
    lo_pt = 0.0 if idx == 0 else float(bounds[idx - 1])

    if idx >= len(TIER_LABELS) - 1:
        hi_pt = ceiling
        span = hi_pt - lo_pt
        pct = (
            max(0.0, min(100.0, ((tp - lo_pt) / span) * 100.0)) if span > 0 else 100.0
        )
        return {
            "composite": round(comp, 4),
            "tier_points": tier_pts,
            "points_to_next": None,
            "progress_pct": round(pct, 1),
            "band_lo_pts": int(round(lo_pt)),
            "band_hi_pts": int(ceiling),
        }

    hi_pt = float(bounds[idx])
    span = hi_pt - lo_pt
    pct = max(0.0, min(100.0, ((tp - lo_pt) / span) * 100.0)) if span > 0 else 100.0
    gap_pts = max(0, int(round(hi_pt - tp)))

    return {
        "composite": round(comp, 4),
        "tier_points": tier_pts,
        "points_to_next": gap_pts,
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
    cuts = settings.composite_points_upper_bounds
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
