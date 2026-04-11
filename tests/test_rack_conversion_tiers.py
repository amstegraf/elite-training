from __future__ import annotations

import pytest

from app.services.rack_conversion_tiers import rack_conversion_tier_label


@pytest.mark.parametrize(
    ("rate", "expected"),
    [
        (0.0, "Inconsistent / developing"),
        (0.199, "Inconsistent / developing"),
        (0.20, "Strong amateur"),
        (0.349, "Strong amateur"),
        (0.35, "Advanced"),
        (0.499, "Advanced"),
        (0.50, "Semi-pro"),
        (0.649, "Semi-pro"),
        (0.65, "Elite"),
        (1.0, "Elite"),
    ],
)
def test_rack_conversion_tier_label_boundaries(rate: float, expected: str) -> None:
    assert rack_conversion_tier_label(rate) == expected


def test_rack_conversion_tier_label_none() -> None:
    assert rack_conversion_tier_label(None) is None
