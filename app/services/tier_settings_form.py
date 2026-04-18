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
        penalty_factor=req_float("penalty_factor"),
    )
