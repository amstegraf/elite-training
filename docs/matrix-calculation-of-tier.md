🧠 1) Inputs (your KPIs)
========================

Use only:

-   **Potting % (POT)**
-   **Position Success % (POS)**
-   **Rack Conversion % (CONV)**

* * * * *

🎯 2) Normalize each KPI into a score (0--4)
===========================================

POT score
---------

<90%   → 0\
90--93  → 1\
93--95  → 2\
95--97  → 3\
97%+   → 4

* * * * *

POS score
---------

<55%   → 0\
55--65  → 1\
65--75  → 2\
75--85  → 3\
85%+   → 4

* * * * *

CONV score
----------

<20%   → 0\
20--35  → 1\
35--50  → 2\
50--65  → 3\
65%+   → 4

* * * * *

🧮 3) Weighted composite score
==============================

Position matters most → then conversion → then potting

Composite Score =\
( POS * 0.5 ) +\
( CONV * 0.3 ) +\
( POT * 0.2 )

Range:

0 → 4

* * * * *

🏁 4) Tier mapping
==================

0.0 -- 1.0   → Inconsistent / developing\
1.0 -- 2.0   → Strong amateur\
2.0 -- 3.0   → Advanced\
3.0 -- 3.5   → Semi-pro\
3.5 -- 4.0   → Elite

* * * * *

🧠 5) Why this works (important)
================================

-   POT stabilizes early → low weight
-   POS drives pattern quality → high weight
-   CONV reflects real outcome → medium weight

* * * * *

📊 6) Example (your current numbers)
====================================

-   POT: 94% → **2**
-   POS: 58% → **1**
-   CONV: 22% → **1**

Score =\
(1 * 0.5) + (1 * 0.3) + (2 * 0.2)\
= 0.5 + 0.3 + 0.4 = 1.2

→ **Strong amateur (low side)**

* * * * *

🧠 7) Matrix view (optional UI)
===============================

You can also display a **3-axis interpretation**:

| POS \ CONV | Low (<35) | Mid (35--50) | High (50+) |
| --- | --- | --- | --- |
| Low (<65) | Developing | Amateur | Amateur |
| Mid (65--75) | Amateur | Advanced | Advanced |
| High (75+) | Advanced | Semi-pro | Elite |

Potting acts as a **modifier**, not a primary axis.

* * * * *

🔧 8) Algorithm (ready for dev)
===============================

int potScore = getPotScore(pot);\
int posScore = getPosScore(pos);\
int convScore = getConvScore(conv);

double composite =\
    (posScore * 0.5) +\
    (convScore * 0.3) +\
    (potScore * 0.2);

Tier tier = mapToTier(composite);

* * * * *

⚠️ 9) Important rule
====================

Do NOT allow:

> high POT to push tier alone

That's why weight is low.