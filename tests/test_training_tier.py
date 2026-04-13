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
    kpi_score_from_pct_continuous,
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
    assert training_tier_label(0.94, 0.58, 0.22, settings=cfg) == "Strong Amateur"


def test_training_tier_dashboard_meta_doc_example() -> None:
    cfg = TierSettings()
    meta = training_tier_dashboard_meta(0.94, 0.58, 0.22, settings=cfg)
    assert meta is not None
    assert meta["composite"] == pytest.approx(1.49)
    assert meta["tier_points"] == 1490
    assert meta["points_to_next"] == 510
    assert meta["band_lo_pts"] == 1000
    assert meta["band_hi_pts"] == 2000


def test_training_tier_dashboard_meta_elite_no_gap() -> None:
    cfg = TierSettings()
    meta = training_tier_dashboard_meta(1.0, 1.0, 1.0, settings=cfg)
    assert meta is not None
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
    # +0.1% pot should produce a small points delta (not a 200-point jump).
    assert 0 < (high["tier_points"] - low["tier_points"]) < 20


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


def test_overall_rack_conversion_breakdown_empty() -> None:
    assert overall_rack_conversion_breakdown([]) == (None, 0, 0)


def test_tier_settings_roundtrip_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.tier_settings_store.tier_settings_path", lambda: tmp_path / "tier_settings.json")
    a = TierSettings(weight_pos=0.45, weight_conv=0.35, weight_pot=0.2)
    save_tier_settings(a)
    b = load_tier_settings()
    assert b.weight_pos == 0.45
    assert b.weight_conv == 0.35
    assert b.weight_pot == 0.2
    raw = json.loads((tmp_path / "tier_settings.json").read_text(encoding="utf-8"))
    assert raw["weight_pos"] == 0.45


def test_corrupt_tier_settings_file_falls_back_to_default(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    p = tmp_path / "tier_settings.json"
    p.write_text("{not json", encoding="utf-8")
    monkeypatch.setattr("app.services.tier_settings_store.tier_settings_path", lambda: p)
    assert load_tier_settings().weight_pos == 0.5
