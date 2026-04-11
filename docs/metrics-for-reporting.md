🎯 1) Core Metrics (only what matters)
======================================

A. **Avg Balls Cleared per Rack** (PRIMARY KPI)
-----------------------------------------------

-   Definition:

    > how far you go before failure

-   Why it matters:
    -   combines **position + potting + decision**
    -   best single indicator of real performance

* * * * *

B. **Misses per Rack**
----------------------

-   Inverse of above, but more intuitive

> Goal: **1 → 0.7 → 0.5 → 0.3**

* * * * *

C. **Miss Type Distribution**
-----------------------------

-   % Position
-   % Alignment
-   % Speed
-   % Combined

Why:

> tells you *what to train next*

* * * * *

D. **Miss Position (Ball Index)**
---------------------------------

-   Where do you fail?
    -   early (1--3)
    -   mid (4--6)
    -   late (7--9)

Why:

-   early → pattern issue
-   late → execution under pressure

* * * * *

E. **"No Shot Due to Position" Count**
--------------------------------------

Critical for your case.

> This should drop significantly over time

* * * * *

F. **Streaks**
--------------

-   max balls in a row
-   racks without miss

Why:

> detects breakthrough moments

* * * * *

📊 2) Graphs (what they should look like)
=========================================

1\. Avg Balls Cleared (line chart)
----------------------------------

Day 1: 4.5\
Day 5: 5.2\
Day 10: 6.1\
Day 20: 6.8

### What improvement looks like:

-   slow upward trend
-   small dips (normal)
-   occasional jump → new level reached

* * * * *

2\. Misses per Rack (line chart)
--------------------------------

Inverse of above.

### What improvement looks like:

-   gradual downward slope
-   less variance over time

* * * * *

3\. Miss Type Distribution (stacked bar)
----------------------------------------

Example:

Week 1:\
Position: 60%\
Alignment: 30%\
Other: 10%

Week 4:\
Position: 30%\
Alignment: 55%\
Other: 15%

### What improvement looks like:

-   **position decreases**
-   alignment becomes dominant (expected progression)

* * * * *

4\. Miss Ball Distribution (histogram)
--------------------------------------

Example:

Ball 2--3 → many misses\
Ball 6--9 → fewer

Later:

Ball 6--9 → most misses

### What improvement looks like:

> misses shift **later in the rack**

* * * * *

5\. "No Shot Due to Position" (line chart)
------------------------------------------

### What improvement looks like:

-   sharp drop early (big win)
-   then stabilizes low

* * * * *

6\. Best Run / Max Balls (line chart)
-------------------------------------

3 → 5 → 7 → 6 → 8 → 9

### What improvement looks like:

-   spikes upward
-   not linear → **breakthrough metric**

* * * * *

🧠 3) How to Recognize REAL Improvement
=======================================

✅ 1. Misses move later in rack
------------------------------

-   from ball 3 → ball 6+

✅ 2. Position errors decrease
-----------------------------

-   replaced by alignment errors

✅ 3. Racks feel easier (you already saw this)
---------------------------------------------

✅ 4. More "clean runs", even if misses still exist
--------------------------------------------------

✅ 5. Variance reduces
---------------------

-   fewer very bad racks

* * * * *

⚠️ False signals (don't get fooled)
===================================

❌ "Misses per rack stays same"
------------------------------

-   can still be improvement (you already experienced this)

❌ "Score not increasing yet"
----------------------------

-   early phases don't reflect immediately

❌ "Feels easy but results same"
-------------------------------

-   this is **transition phase**

* * * * *

🧩 4) Metric Relationships (very important)
===========================================

Progression usually looks like:

1.  Position errors ↓
2.  Alignment errors ↑ (temporary)
3.  Avg balls ↑
4.  Streaks ↑
5.  Misses ↓

If you don't see this pattern → something is wrong

* * * * *

🎯 5) What YOU should focus on right now
========================================

Given your current state:

### Track closely:

-   avg balls per rack
-   alignment %
-   "no shot due to position"

### Ignore (for now):

-   complex scoring
-   minor metrics

* * * * *

Final summary
=============

If your system works, you will see:

> **Misses stay similar → but move later → then suddenly drop**

That's the real curve.