🧠 What "Recovery" actually means
=================================

> You made a **training mistake** (position/speed)\
> but still **continued the rack successfully**

So:

-   Training miss → potential failure
-   Recovery → you avoided turning it into a true miss

* * * * *

🎯 1) Core Definition
=====================

### Recovery Event

A recovery =

> **a training miss followed by at least one successful pot**

* * * * *

📊 2) Core Metrics to build
===========================

A. Recovery Count
-----------------

-   total number of recoveries in session

* * * * *

B. Recovery Rate (MAIN KPI)
---------------------------

Recovery Rate = Recoveries / Training Misses

Example:

-   8 training misses
-   5 recoveries

→ Recovery Rate = **62.5%**

* * * * *

C. Failed Recovery
------------------

Training miss → next event = TRUE MISS

Failed Recovery Rate = Failed recoveries / Training Misses

* * * * *

D. Multi-Step Recovery (advanced, optional later)
-------------------------------------------------

-   training miss → 2+ successful shots after

This shows:

> **strong recovery**, not lucky survival

* * * * *

🧩 3) How to derive from your existing data
===========================================

You already have:

-   MissEvent (type, outcome, ball number)
-   Rack structure
-   Ball progression

* * * * *

Logic (simple and reliable)
---------------------------

For each **training miss**:

1.  Look at next event in same rack

### Case A --- next event is:

-   another ball potted (no TRUE miss)

→ ✅ **Recovery**

* * * * *

### Case B --- next event is:

-   TRUE MISS

→ ❌ **Failed Recovery**

* * * * *

### Case C --- end of rack but no TRUE MISS recorded

→ treat as recovery (optional rule)

* * * * *

🧠 Important nuance (don't skip)
================================

Do NOT require:

-   perfect position after
-   perfect shot after

Only requirement:

> **you kept the rack alive**

* * * * *

📈 4) How to display it
=======================

Simple (MVP)
------------

-   Recovery Rate: **62%**
-   Failed Recovery: **38%**

* * * * *

Better
------

Training misses: 8\
Recovered: 5\
Failed: 3\
Recovery rate: 62%

* * * * *

Advanced (later)
----------------

-   recovery by type:
    -   position recovery %
    -   speed recovery %

* * * * *

🔍 5) How to interpret it
=========================

High recovery rate (>70%)
-------------------------

-   strong adaptability
-   good shot-making under pressure
-   position errors are survivable

* * * * *

Medium (40--70%)
---------------

-   current level (likely where you are)
-   inconsistent recovery

* * * * *

Low (<40%)
----------

-   position errors are fatal
-   poor adaptability

* * * * *

⚠️ Critical insight
===================

This metric tells you:

> **how dangerous your mistakes are**

Not just how many you make.

* * * * *

🧠 6) Why this is powerful for YOU
==================================

Right now:

-   you have many training misses
-   but also good potting

So recovery will show:

> are those misses actually killing your racks?

* * * * *

🎯 Final instruction to app builder (clean)
===========================================

### Add:

#### Field:

-   `isRecovery` (boolean)

#### Derived logic:

-   For each training miss:
    -   if next event != true miss → `isRecovery = true`
    -   else → `false`

#### Metrics:

-   recoveryCount
-   recoveryRate
-   failedRecoveryRate

* * * * *

🔑 Final takeaway
=================

You now have 3 layers:

1.  **Performance** → avg balls, true misses
2.  **Precision** → training misses
3.  **Resilience** → recovery

Together → complete picture.

---

## App implementation (elite-training)

Session fields (recomputed with `recompute_session_aggregates` and persisted via `scripts/migrate_sessions.py`):

- `recoveryCount`, `failedRecoveryCount`
- `recoveryRate`, `failedRecoveryRate` (0–1; each equals count ÷ `trainingMissCount` when training misses exist)

Logic matches §3: misses are ordered by `createdAt` (then `ballNumber`) within each rack; only **training** misses (`miss_breaks_run` is false) are classified. **Recovery** if the next miss in that rack is not a true miss, or there is no next miss (rack ended without a true miss after). **Failed recovery** if the next miss is a true miss.

Shown on **session report** and **progress** charts (`recovery_pct` / `failed_recovery_pct`).