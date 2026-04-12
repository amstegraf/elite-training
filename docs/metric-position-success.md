Best Position KPI (simple + meaningful)
========================================

**Position Success Rate**
-------------------------

Position Success = (Total Shots - Position Misses) / Total Shots

* * * * *

Problem
-------

You don't log total shots directly.

* * * * *

✅ Adapted to your system (miss-only tracking)
=============================================

Use this:
---------

Position outcome = 1 - (Position-related misses / Balls Cleared), where position-related = no-shot/both outcomes **plus** misses tagged **position** or **speed**.

* * * * *

Example (your session)
----------------------

-   Balls cleared = 23
-   Position-related misses ≈ 5 (e.g. no-shot/both + position- or speed-tagged logs)

1 - (5 / 23) ≈ 78%

* * * * *

🎯 Interpretation
=================

-   **>85%** → strong
-   **75--85%** → developing (you likely here)
-   **<75%** → position is breaking patterns

* * * * *

🧠 Why this works
=================

-   normalized to actual play volume
-   aligned with your logging (miss-only)
-   directly comparable to pot success

* * * * *

⚠️ Important refinement (better version)
========================================

Split position into:

A. Hard position failures (most important)
------------------------------------------

Hard Position Success = 1 - (No-shot events / Balls cleared)

This measures:

> how often position completely breaks the rack

* * * * *

B. Soft position errors
-----------------------

Soft Position Success = 1 - (Position misses / Balls cleared)

This measures:

> precision quality

* * * * *

🎯 What you should track (minimal)
==================================

Keep only:

-   **Pot success % (you have)**
-   **Position success % (new)**
-   **No-shot rate**

That's your full execution picture.

* * * * *

🔑 Key insight
==============

You now get:

-   Potting → 96% (very strong)
-   Position → ~75--80% (limiting factor)

→ perfectly matches your gameplay reality

* * * * *

📊 Final recommendation (clean KPI set)
=======================================

Display:

Pot Success:        96%\
Position Success:   78%\
No-shot Rate:       9% (example)

* * * * *

Implementation (app)
====================

Session aggregates (`recompute_session_aggregates`) store:

- **`positionRelatedMissCount`**: one per miss if `no_shot_position` / `both` outcome (same rule as no-shot KPI), **else** if the miss has a **position** or **speed** tag (speed is treated as a positional execution error for this outcome). Already-counted no-shot/both is not double-counted.
- **`positionSuccessRate`**: `max(0, min(1, 1 − positionRelatedMissCount / totalBallsCleared))` when `totalBallsCleared > 0`.

Overall (dashboard) uses **Σ misses / Σ balls cleared** across completed sessions, then the same `1 − ratio` formula.