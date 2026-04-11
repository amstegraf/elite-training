# Reporting fixes — ball runs vs logged events

## Problem

The app logs **every** noteworthy event (position, no-shot, playable shape, pot miss). Treating all of them like a **pot miss that breaks your ball run** skews:

- **Best run (balls)** — streaks of balls made without a **run-ending** failure were too low when `no_shot_position` or `playable` were treated like terminal misses.
- **Avg balls before true miss** — was averaged incorrectly across racks (variable scope / wrong definition).
- **Consecutive miss rules** — position / training logs should not always increment the same counter as a missed pot.

## Definitions

| Concept | Meaning |
|--------|--------|
| **Run-breaking miss** | An event that **ends the current ball-streak** for metrics. Default: only `pot_miss` and `both`. |
| **Soft / training log** | `playable` and `no_shot_position` **do not** break the run unless explicitly marked. |
| **`endsRun` on an event** | Optional override: `true` = breaks the run (counts as a true miss for streaks); `false` = does not break (even on `pot_miss` in edge cases). `null`/omitted = use outcome defaults above. |

**True miss count** = number of **run-breaking** events.  
**Training miss count** = all other logged rows (soft position / shape notes).  
**Total misses** = all logged rows (`true + training`).

**No shot (position) KPI** = still counts outcomes `no_shot_position` and `both` (diagnostic), independent of `endsRun`.

## Balls cleared

- If the rack has at least one **run-breaking** event: inferred default = `min(ballNumber) - 1` over those events.
- If the rack has **only** soft logs: do **not** infer `ballsCleared` from misses alone — keep the value from **end rack** (checkbox count) or leave unset.

## Migration

From the repo root:

```bash
python scripts/migrate_sessions.py
python scripts/migrate_sessions.py --dry-run
python scripts/migrate_sessions.py --id <session-uuid>
```

Each session file is reloaded, `recompute_session_aggregates` runs, and KPIs are written back (unless `--dry-run`).

The **`/progress`** page does **not** rely on stored session totals: `aggregate_sessions_progress` calls `recompute_session_aggregates` on each completed session in memory so charts match the current rules even if JSON was never migrated.
