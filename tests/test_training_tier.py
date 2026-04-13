from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.models import TierSettings
from app.services.rack_conversion_tiers import overall_rack_conversion_breakdown
from app.services.tier_settings_store import load_tier_settings, save_tier_settings
from app.services.training_tier import (
    composite_score,
    imbalance_penalty_adjusted_composite,
    kpi_score_from_pct_continuous,
    semantic_tier_index_with_threshold_gate,
    threshold_gate_tier_index,
    training_tier_dashboard_meta,
    training_tier_label,
)


def test_matrix_doc_example_tier() -> None:
    """Continuous scoring: POT/POS/CONV interpolate inside their active bands."""
    cfg = TierSettings()
    assert kpi_score_from_pct_continuous(94.0, cfg.pot_pct_lower_bounds) == pytest.approx(
        2.5
    )
    assert kpi_score_from_pct_continuous(58.0, cfg.pos_pct_lower_bounds) == pytest.approx(
        1.3
    )
    assert kpi_score_from_pct_continuous(22.0, cfg.conv_pct_lower_bounds) == pytest.approx(
        1.1333333333
    )
    comp = composite_score(1.3, 1.1333333333, 2.5, cfg)
    assert abs(comp - 1.49) < 1e-9
    # Hybrid model: points can be high, but label is gated by KPI minima (b0/b1/b2/b3).
    assert training_tier_label(0.94, 0.58, 0.22, settings=cfg) == "Amateur"


def test_training_tier_dashboard_meta_doc_example() -> None:
    cfg = TierSettings()
    meta = training_tier_dashboard_meta(0.94, 0.58, 0.22, settings=cfg)
    assert meta is not None
    assert meta["base_composite"] == pytest.approx(1.49)
    assert meta["imbalance"] == pytest.approx(1.3666666667, abs=1e-4)
    assert meta["penalty"] == pytest.approx(0.3416666667, abs=1e-4)
    assert meta["composite"] == pytest.approx(1.1483, abs=1e-4)
    assert meta["tier_points"] == 1148
    assert meta["points_to_next"] == 852
    assert meta["band_lo_pts"] == 1000
    assert meta["band_hi_pts"] == 2000


def test_training_tier_dashboard_meta_elite_no_gap() -> None:
    cfg = TierSettings()
    meta = training_tier_dashboard_meta(1.0, 1.0, 1.0, settings=cfg)
    assert meta is not None
    assert meta["base_composite"] == pytest.approx(4.0)
    assert meta["imbalance"] == pytest.approx(0.0)
    assert meta["penalty"] == pytest.approx(0.0)
    assert meta["composite"] == pytest.approx(4.0)
    assert meta["tier_points"] == 4000
    assert meta["points_to_next"] is None
    assert meta["band_lo_pts"] == 3500
    assert meta["band_hi_pts"] == 4000


def test_tier_settings_migrates_legacy_composite_bounds() -> None:
    s = TierSettings.model_validate(
        {
            "composite_points_scale": 1000,
            "composite_upper_bounds": (1.0, 2.0, 3.0, 3.5),
        }
    )
    assert s.composite_points_upper_bounds == (500, 1000, 2000, 3000, 3500)


def test_tier_settings_expands_four_stored_int_cuts() -> None:
    s = TierSettings.model_validate({"composite_points_upper_bounds": [1000, 2000, 3000, 3500]})
    assert s.composite_points_upper_bounds == (500, 1000, 2000, 3000, 3500)


def test_tier_settings_rejects_last_cut_at_ceiling() -> None:
    with pytest.raises(ValidationError):
        TierSettings(
            composite_points_scale=1000,
            composite_points_upper_bounds=(1000, 2000, 3000, 3500, 4000),
        )


def test_training_tier_label_none_if_any_rate_missing() -> None:
    assert training_tier_label(0.9, None, 0.5, settings=TierSettings()) is None
    assert training_tier_label(None, None, None, settings=TierSettings()) is None


def test_tier_settings_validation_strict_bounds() -> None:
    with pytest.raises(ValidationError):
        TierSettings(pot_pct_lower_bounds=(90.0, 95.0, 93.0, 97.0))


def test_tier_settings_validation_weights() -> None:
    with pytest.raises(ValidationError):
        TierSettings(weight_pos=0.4, weight_conv=0.3, weight_pot=0.2)


def test_all_minimum_rates_beginner_tier() -> None:
    cfg = TierSettings()
    assert training_tier_label(0.0, 0.0, 0.0, settings=cfg) == "Beginner"


def test_all_maximum_rates_elite_tier() -> None:
    cfg = TierSettings()
    assert training_tier_label(1.0, 1.0, 1.0, settings=cfg) == "Elite"


def test_continuous_score_monotonic_within_each_interval() -> None:
    bounds = (90.0, 93.0, 95.0, 97.0)
    pts = [90.1, 90.5, 91.0, 92.0, 92.9]
    vals = [kpi_score_from_pct_continuous(x, bounds) for x in pts]
    assert vals == sorted(vals)

    pts2 = [93.1, 93.8, 94.2, 94.9]
    vals2 = [kpi_score_from_pct_continuous(x, bounds) for x in pts2]
    assert vals2 == sorted(vals2)


def test_continuous_score_smooth_for_small_pct_change() -> None:
    cfg = TierSettings()
    low = training_tier_dashboard_meta(0.940, 0.58, 0.22, settings=cfg)
    high = training_tier_dashboard_meta(0.941, 0.58, 0.22, settings=cfg)
    assert low is not None and high is not None
    # Small KPI deltas should create small points movement (not 200/300/500 jumps).
    assert abs(high["tier_points"] - low["tier_points"]) < 20


def test_continuous_score_clamps_at_extremes() -> None:
    bounds = (90.0, 93.0, 95.0, 97.0)
    assert kpi_score_from_pct_continuous(-10.0, bounds) == 0.0
    assert kpi_score_from_pct_continuous(0.0, bounds) == 0.0
    assert kpi_score_from_pct_continuous(200.0, bounds) == 4.0


def test_tier_index_alignment_with_point_cuts_continuous() -> None:
    cfg = TierSettings()
    # Exactly at first anchors => each KPI score is 1.0 -> composite 1.0 -> 1000 points.
    m = training_tier_dashboard_meta(0.90, 0.55, 0.20, settings=cfg)
    assert m is not None
    assert m["tier_points"] == 1000
    assert m["band_lo_pts"] == 1000
    assert m["band_hi_pts"] == 2000
    assert m["next_tier_label"] == "Advanced"


def test_imbalance_penalty_reduces_unbalanced_composite() -> None:
    cfg = TierSettings()
    base = composite_score(1.3, 1.1333333333, 2.5, cfg)
    adjusted, imbalance, penalty = imbalance_penalty_adjusted_composite(
        pos_score=1.3,
        conv_score=1.1333333333,
        pot_score=2.5,
        base_composite=base,
        settings=cfg,
    )
    assert base == pytest.approx(1.49)
    assert imbalance == pytest.approx(1.3666666667, abs=1e-4)
    assert penalty == pytest.approx(0.3416666667, abs=1e-4)
    assert adjusted == pytest.approx(1.1483333333, abs=1e-4)


def test_penalty_factor_zero_disables_penalty_effect() -> None:
    cfg = TierSettings(penalty_factor=0.0)
    meta = training_tier_dashboard_meta(0.94, 0.58, 0.22, settings=cfg)
    assert meta is not None
    assert meta["penalty"] == pytest.approx(0.0)
    assert meta["composite"] == pytest.approx(meta["base_composite"])
    assert meta["tier_points"] == 1490


def test_b3_maps_to_score_three_and_keeps_elite_headroom() -> None:
    cfg = TierSettings(
        pot_pct_lower_bounds=(65.0, 82.0, 90.0, 94.0),
        pos_pct_lower_bounds=(30.0, 50.0, 65.0, 75.0),
        conv_pct_lower_bounds=(0.0, 10.0, 35.0, 50.0),
        weight_pos=0.3,
        weight_conv=0.5,
        weight_pot=0.2,
        penalty_factor=0.25,
    )
    assert kpi_score_from_pct_continuous(94.0, cfg.pot_pct_lower_bounds) == pytest.approx(3.0)
    assert kpi_score_from_pct_continuous(75.0, cfg.pos_pct_lower_bounds) == pytest.approx(3.0)
    assert kpi_score_from_pct_continuous(50.0, cfg.conv_pct_lower_bounds) == pytest.approx(3.0)
    meta = training_tier_dashboard_meta(0.94, 0.75, 0.50, settings=cfg)
    assert meta is not None
    # Semi-pro minima now land around 3000, leaving room up to 4000 for Elite.
    assert meta["tier_points"] == 3000


def test_no_cliff_dive_at_b3_boundary() -> None:
    bounds = (0.0, 10.0, 35.0, 60.0)
    below = kpi_score_from_pct_continuous(59.9, bounds)
    at = kpi_score_from_pct_continuous(60.0, bounds)
    above = kpi_score_from_pct_continuous(60.1, bounds)
    # No drop at b3: score should be continuous/non-decreasing.
    assert below == pytest.approx(3.0)
    assert at == pytest.approx(3.0)
    assert above > at


def test_penalty_factor_roundtrip_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.tier_settings_store.tier_settings_path", lambda: tmp_path / "tier_settings.json")
    a = TierSettings(penalty_factor=0.33)
    save_tier_settings(a)
    b = load_tier_settings()
    assert b.penalty_factor == pytest.approx(0.33)


def test_overall_rack_conversion_breakdown_empty() -> None:
    assert overall_rack_conversion_breakdown([]) == (None, 0, 0)


def test_tier_settings_roundtrip_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.tier_settings_store.tier_settings_path", lambda: tmp_path / "tier_settings.json")
    a = TierSettings(weight_pos=0.45, weight_conv=0.35, weight_pot=0.2, penalty_factor=0.31)
    save_tier_settings(a)
    b = load_tier_settings()
    assert b.weight_pos == 0.45
    assert b.weight_conv == 0.35
    assert b.weight_pot == 0.2
    assert b.penalty_factor == pytest.approx(0.31)
    raw = json.loads((tmp_path / "tier_settings.json").read_text(encoding="utf-8"))
    assert raw["weight_pos"] == 0.45
    assert raw["penalty_factor"] == pytest.approx(0.31)


def test_corrupt_tier_settings_file_falls_back_to_default(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    p = tmp_path / "tier_settings.json"
    p.write_text("{not json", encoding="utf-8")
    monkeypatch.setattr("app.services.tier_settings_store.tier_settings_path", lambda: p)
    assert load_tier_settings().weight_pos == 0.5


def test_threshold_gate_caps_label_below_advanced_when_kpis_not_meeting_advanced_minima() -> None:
    cfg = TierSettings(
        pot_pct_lower_bounds=(65.0, 82.0, 90.0, 94.0),
        pos_pct_lower_bounds=(30.0, 50.0, 65.0, 75.0),
        conv_pct_lower_bounds=(0.0, 10.0, 35.0, 50.0),
        weight_pos=0.3,
        weight_conv=0.5,
        weight_pot=0.2,
        penalty_factor=0.25,
    )
    # Points can land in Advanced band, but KPI minima do not satisfy Advanced.
    assert training_tier_label(0.94, 0.58, 0.22, settings=cfg) == "Strong Amateur"
    meta = training_tier_dashboard_meta(0.94, 0.58, 0.22, settings=cfg)
    assert meta is not None
    assert meta["tier_points"] >= 2000


def test_threshold_gate_index_mapping() -> None:
    cfg = TierSettings(
        pot_pct_lower_bounds=(65.0, 82.0, 90.0, 94.0),
        pos_pct_lower_bounds=(30.0, 50.0, 65.0, 75.0),
        conv_pct_lower_bounds=(0.0, 10.0, 35.0, 50.0),
    )
    assert threshold_gate_tier_index(
        pot_pct=89.9, pos_pct=64.9, conv_pct=34.9, settings=cfg
    ) == 2
    assert threshold_gate_tier_index(
        pot_pct=90.0, pos_pct=65.0, conv_pct=35.0, settings=cfg
    ) == 3
    assert semantic_tier_index_with_threshold_gate(points_tier_index=3, gate_tier_index=2) == 2
    assert semantic_tier_index_with_threshold_gate(points_tier_index=5, gate_tier_index=4) == 5
