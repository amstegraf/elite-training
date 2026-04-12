from __future__ import annotations

from typing import Mapping

from app.models import TierSettings


def parse_tier_settings_form(form: Mapping[str, str]) -> TierSettings:
    """Build ``TierSettings`` from POST body (flat field names)."""

    def req(key: str) -> float:
        raw = str(form.get(key, "")).strip()
        if raw == "":
            raise ValueError(f"Missing field: {key}")
        return float(raw)

    return TierSettings(
        pot_pct_lower_bounds=(
            req("pot_b0"),
            req("pot_b1"),
            req("pot_b2"),
            req("pot_b3"),
        ),
        pos_pct_lower_bounds=(
            req("pos_b0"),
            req("pos_b1"),
            req("pos_b2"),
            req("pos_b3"),
        ),
        conv_pct_lower_bounds=(
            req("conv_b0"),
            req("conv_b1"),
            req("conv_b2"),
            req("conv_b3"),
        ),
        weight_pos=req("w_pos"),
        weight_conv=req("w_conv"),
        weight_pot=req("w_pot"),
        composite_upper_bounds=(
            req("comp_c0"),
            req("comp_c1"),
            req("comp_c2"),
            req("comp_c3"),
        ),
    )
