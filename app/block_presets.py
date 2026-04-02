"""Preset training blocks from docs/training-platform-description.md §8.1."""

from __future__ import annotations

from typing import Any

# Titles and goals match the product spec (example blocks).
BLOCK_PRESETS: list[dict[str, Any]] = [
    {
        "name": "Pure Run-Out",
        "purpose": "Achieve a number of perfect racks in a row.",
        "summary": "3 perfect racks in a row",
        "details": [
            "Goal: 3 perfect racks in a row",
            "Follow full No Error definition",
            "No safety play (offensive only)",
            "Ball in hand start",
            "If you make 2 perfect racks and fail the 3rd → back to 0",
            "This builds streak pressure tolerance",
        ],
        "target": None,
    },
    {
        "name": "Positional Precision Drill",
        "purpose": "Complete sequences where the cue ball lands in defined target zones.",
        "summary": "Land the cue ball in the target zone every time",
        "details": [
            "Setup: 3 balls + cue ball",
            "Define a small target zone (1 diamond area or smaller)",
            "Miss zone = reset",
            "Complete 10 perfect sequences",
            "This removes the “almost good” problem",
        ],
        "target": None,
    },
    {
        "name": "Break & Run Simulation",
        "purpose": "Simulate real rack execution; log only clean break-and-run outcomes.",
        "summary": "Clean break & runs only (No Error applies)",
        "details": [
            "Goal: simulate match reality",
            "Full rack, break, then play normally",
            "Same No Error rule applies: any imperfection = loss of rack",
            "Score: track clean break & runs only",
        ],
        "target": None,
    },
    {
        "name": "Pressure Finishing",
        "purpose": "Complete end-rack patterns perfectly for a target number of repetitions.",
        "summary": "10 perfect finishes in a row",
        "details": [
            "Setup: 4–5 balls remaining (typical end of rack)",
            "Goal: complete end-rack patterns perfectly for 10 repetitions",
            "Any slight angle issue → restart",
            "No recovery shots allowed",
            "This directly targets your “1 miss per rack” problem",
        ],
        "target": None,
    },
]
