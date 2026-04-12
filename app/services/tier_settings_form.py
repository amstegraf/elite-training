from __future__ import annotations

from typing import Mapping

from app.models import TierSettings


def parse_tier_settings_form(form: Mapping[str, str]) -> TierSettings:
    """Build ``TierSettings`` from POST body (flat field names)."""

    def req_float(key: str) -> float:
        raw = str(form.get(key, "")).strip()
        if raw == "":
            raise ValueError(f"Missing field: {key}")
        return float(raw)

    def req_int(key: str) -> int:
        raw = str(form.get(key, "")).strip()
        if raw == "":
            raise ValueError(f"Missing field: {key}")
        return int(round(float(raw)))

    return TierSettings(
        pot_pct_lower_bounds=(
            req_float("pot_b0"),
            req_float("pot_b1"),
            req_float("pot_b2"),
            req_float("pot_b3"),
        ),
        pos_pct_lower_bounds=(
            req_float("pos_b0"),
            req_float("pos_b1"),
            req_float("pos_b2"),
            req_float("pos_b3"),
        ),
        conv_pct_lower_bounds=(
            req_float("conv_b0"),
            req_float("conv_b1"),
            req_float("conv_b2"),
            req_float("conv_b3"),
        ),
        weight_pos=req_float("w_pos"),
        weight_conv=req_float("w_conv"),
        weight_pot=req_float("w_pot"),
        composite_points_scale=req_int("points_scale"),
        composite_points_upper_bounds=(
            req_int("comp_pt_0"),
            req_int("comp_pt_1"),
            req_int("comp_pt_2"),
            req_int("comp_pt_3"),
        ),
    )
