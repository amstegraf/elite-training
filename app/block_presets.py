"""Preset training blocks from docs/training-platform-description.md §8.1."""

from __future__ import annotations

from typing import Any

# Titles and goals match the product spec (example blocks).
BLOCK_PRESETS: list[dict[str, Any]] = [
    {
        "name": "Pure Run-Out",
        "purpose": "Achieve a number of perfect racks in a row.",
        "target": None,
    },
    {
        "name": "Positional Precision Drill",
        "purpose": "Complete sequences where the cue ball lands in defined target zones.",
        "target": None,
    },
    {
        "name": "Break & Run Simulation",
        "purpose": "Simulate real rack execution; log only clean break-and-run outcomes.",
        "target": None,
    },
    {
        "name": "Pressure Finishing",
        "purpose": "Complete end-rack patterns perfectly for a target number of repetitions.",
        "target": None,
    },
]
