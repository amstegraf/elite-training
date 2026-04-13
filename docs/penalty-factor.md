🧠 1) Goal
==========

Keep:

-   smooth progression (your current model)

Fix:

-   inflated scores from uneven KPIs

* * * * *

🎯 2) Concept
=============

> Penalize imbalance between KPIs

If:

-   all KPIs similar → no penalty
-   one KPI much lower → reduce composite

* * * * *

🧮 3) Core Formula
==================

Step 1 --- compute scores (already done)
--------------------------------------

double potScore;   // 0--4\
double posScore;   // 0--4\
double convScore;  // 0--4

* * * * *

Step 2 --- base composite (existing)
----------------------------------

double composite =\
    posScore * weightPos +\
    convScore * weightConv +\
    potScore * weightPot;

* * * * *

Step 3 --- compute imbalance
--------------------------

double maxScore = max(potScore, posScore, convScore);\
double minScore = min(potScore, posScore, convScore);

double imbalance = maxScore - minScore;

* * * * *

Step 4 --- apply soft penalty
---------------------------

double penaltyFactor = settings.penaltyFactor; // e.g. 0.25

double penalty = imbalance * penaltyFactor;

double compositeAdjusted = composite - penalty;

* * * * *

Step 5 --- clamp result
---------------------

compositeAdjusted = clamp(compositeAdjusted, 0, 4);

* * * * *

🎯 4) Recommended Defaults
==========================

{\
  "penaltyFactor": 0.25\
}

### Behavior:

-   imbalance = 0 → no penalty
-   imbalance = 2 → -0.5 score
-   imbalance = 3 → -0.75 score

✔ noticeable but not destructive

* * * * *

📊 5) Example (your real case)
==============================

Scores:

-   POT = 2.5
-   POS = 1.3
-   CONV = 1.13

max = 2.5\
min = 1.13\
imbalance = 1.37

Penalty:

penalty = 1.37 * 0.25 ≈ 0.34

Composite:

1.49 → 1.49 - 0.34 = 1.15

✔ slightly reduced → more realistic

* * * * *

🧠 6) Optional refinement (recommended)
=======================================

Normalize imbalance sensitivity
-------------------------------

Instead of raw difference:

double normalizedImbalance = imbalance / 4.0;\
double penalty = normalizedImbalance * penaltyFactor * 4;

This keeps behavior stable if scale changes later.

* * * * *

🎯 7) UI / UX Impact
====================

You should expose:
------------------

-   Tier Points (adjusted)
-   Tier Label (based on adjusted)

Optional (advanced view):

-   "Balance penalty: -0.34"

* * * * *

🧠 8) Debug / Transparency Mode (very useful)
=============================================

Show breakdown:

Base Score: 1.49\
Imbalance: 1.37\
Penalty: -0.34\
Final Score: 1.15

This helps:

-   tuning weights
-   validating system

* * * * *

⚠️ 9) Edge Cases
================

Case 1 --- very low player
------------------------

-   all scores low → imbalance small\
    ✔ no issue

* * * * *

Case 2 --- one KPI extremely high
-------------------------------

Example:

-   POT = 4
-   POS = 1
-   CONV = 1

imbalance = 3 → penalty = 0.75

✔ prevents false high rating

* * * * *

🧩 10) Config Extension
=======================

Add to `tier_settings.json`:

{\
  "weights": {\
    "pos": 0.3,\
    "conv": 0.5,\
    "pot": 0.2\
  },\
  "penalty": {\
    "enabled": true,\
    "factor": 0.25\
  }\
}

* * * * *

🔑 11) Why this works
=====================

-   preserves smooth progression ✔
-   prevents single-KPI inflation ✔
-   remains configurable ✔
-   simple to implement ✔

* * * * *

🎯 Final summary
================

Algorithm
---------

composite = weighted average\
imbalance = max - min\
penalty = imbalance * factor\
final = composite - penalty

* * * * *

Outcome
-------

> Balanced players → rewarded\
> Unbalanced players → corrected