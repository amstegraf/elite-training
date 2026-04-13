# Elite Training — Player guide (how the app works)

This document describes **what the application does** and **how you use it** as a player. It is meant for anyone training with the app, not for developers.

---

## What Elite Training is for

Elite Training is a **precision pool training companion** built around strict, honest logging. It helps you:

- See whether **potting**, **positional quality**, and **run-out conversion** are improving over time.
- Work inside **structured programs** (long journeys) and **plans** (specific focuses such as position, alignment, or mixed work).
- Train with a **miss-only habit**: you play normally and **only tap the app when something went wrong**, so the session stays fast and the data stays truthful.

The app rewards **consistency and pattern play**, not casual volume. It is designed for players who want accountability: small compromises in training should show up in the numbers.

---

## Ideas you should keep in mind

- **Unlogged shots count as successes** for the metrics that infer success from misses and rack endings. The discipline is: log every real error you care about.
- A **rack** is a unit of work you finish with **End rack**, where you confirm how many balls you cleared on that rack.
- **Training misses** (soft logs) and **true misses** (run-breaking failures) are distinguished on your session report so you can see both **shape problems** and **hard breakdowns**.

---

## First time on this device

When you open the app for the first time, you are asked to **create your first player** (name). That player becomes the owner of training data you record from then on.

If there were already completed sessions on the device before any player existed, they are **linked to that first player** so nothing is lost.

---

## Multiple players (household or shared computer)

The sidebar shows the **current player** (initials). Open the menu to **switch players** or **add another player**.

- Each player has their **own session list**, dashboard, progress charts, and history.
- **Starting a session** always attaches it to whoever is currently selected.
- You can **rename** or **remove** players under **Settings → Profiles**. Removing a player may offer to clean up sessions that would otherwise belong to no one; use that only when you intend to delete data.

---

## Main areas of the app

| Area | Purpose |
|------|--------|
| **Dashboard** | Start training, manage programs and plans, see recent sessions, overall tier and headline numbers, optional “baseline” for those numbers. |
| **Progress** | Charts of how your key percentages move from session to session. |
| **History** | Full list of sessions, open reports, delete mistakes. |
| **Settings** | Training tier rules (how strict your ladder is), profiles, and app information. |

---

## Programs and plans (structure before you train)

**Program** — A named training journey (for example a 90-day precision block). You can have several programs; one is **active** at a time.

**Plan** — A piece of methodology inside a program: a name, a **focus** (position, alignment, or mixed), and optional targets such as **target zone size** or **how often you train per week**. Plans can also carry **rules** (for example whether several misses in a row should trigger a visible warning or reset behaviour in the live session).

**Typical workflow**

1. On the Dashboard, create a **program** (or use what is already there).
2. Set the program you want as **active**.
3. **Add at least one plan** to that program (the app needs a plan before you can start a session).
4. Choose **Start session** with the plan, table size, and mode you want.

You can add more programs or plans at any time and switch which program is active when your training phase changes.

---

## Starting a session

On the Dashboard, under **Active program & session**:

1. Pick the **plan** you are about to execute (plans from the active program are listed first).
2. Pick **table** size (8 ft or 9 ft) — this is metadata for your own analysis.
3. Pick **mode** — a label for how you are training that day (for example rack work, positional emphasis, potting emphasis, or pressure). It is stored with the session so reports stay honest about context.
4. Press **Start session**.

You land on the **live session** screen. If you leave and come back, use **Continue session** on the Dashboard when a session is still open.

---

## During a live session

### Timer and pause

- The large timer is your **session time**. You can **pause** when you stop training so break time does not inflate your duration.

### Logging a miss

Press **Log miss** when a failure occurs that you want in the record. You will:

1. Choose the **ball** involved.
2. Choose one or more **miss types** (position, alignment, delivery, speed) — pick what actually happened; honesty beats speed.
3. Choose the **outcome**:
   - **Playable (poor shape)** — you missed or got wrong shape but a shot still existed.
   - **Pot miss** — a failed attempt at pocketing the ball (as you interpret it for that drill).
   - **No shot (position)** — you consider the positional failure severe enough that there was no reasonable shot.

Save the miss and return to the table quickly.

### Ending a rack

When the rack is over (whether you cleared the table or stopped early), press **End rack**. You then **tick every ball you actually potted** on that rack. The app uses that to update balls cleared, conversion-style metrics, and rack outcomes.

After you confirm, you can **Start next rack** when you are ready.

### Ending the session

**End session** closes the workout. You are taken to the **session report** for a read-only summary. You cannot add misses on that report screen; if you forgot something, note it in your own journal or accept the session as logged.

---

## Session report (after each workout)

The report is your **truth sheet** for that day. Highlights include:

- **Averages and best run** — Typical balls per rack, how far you tend to get before a hard miss, and your best continuous run of balls.
- **Flow efficiency** — How much “table time” you kept relative to training-level misses (continuity even when you log soft errors).
- **True miss rate** — How often a rack-level failure happens relative to racks played.
- **Rack conversion** — Share of finished racks where you cleared all nine balls (your raw run-out rate for ended racks).
- **Training tier badge** (when the data supports it) — A single label that combines pot success, positional outcome, and rack conversion for that session, using the same philosophy as the dashboard (position weighted heavily, then conversion, then potting).
- **Rack consistency** — Worst, average, and best rack by balls cleared; useful to see if you are streaky or steady.
- **Pot success** and **positional outcome** — Percent-style summaries with short counts so you know what they are built from.
- **True vs training misses** — “Break” style failures vs softer training logs, plus **recovery** statistics: after a training miss, whether the rack often stayed alive or often collapsed.
- **Failure breakdown** — How your misses split across position, alignment, delivery, and speed tags.

Use the report after cool-down to decide what one thing you will fix next session.

---

## Dashboard in depth

Besides starting sessions and managing programs, the Dashboard shows:

### Training tier and headline KPIs

You see a **tier** (for example Beginner through Elite, depending on your settings) and **tier points**, plus overall **pot success**, **positional outcome**, **rack conversion**, and small **trend** hints where the app has enough recent sessions to compare.

These headline numbers are computed from **your recent saved sessions** (up to a large rolling window), not from the whole lifetime of every copy of the app you ever used elsewhere.

### Baseline (“Set” on a session)

In **Recent sessions**, each row can use **Set** in the **Baseline** column. That tells the app: **from this session’s date/time onward**, recompute the dashboard tier, the three headline percentages, and the trend arrows **only using sessions on or after that point**.

Use this when an old training phase would **dilute** your current level — for example after a long break or a deliberate change in technique — so the dashboard reflects **where you are now**, not a blend with years of older data.

A banner appears while a baseline is active; **Clear baseline** returns to using the full loaded history again. If the chosen session is no longer available, the app drops the baseline automatically on the next visit.

### Continue session

If you closed the browser but did not end the session, **Continue session** opens the live table again.

---

## Progress page

**Progress** shows **charts over time** for the current player, including:

- Pot success by session.
- Positional outcome by session.
- How position-tagged vs speed-tagged misses contribute within position-related misses.
- Rack conversion by session.
- Additional series the app derives from the same miss and rack data (for example true-miss rate and flow efficiency).

Use it for **week-to-week** or **month-to-month** perspective when individual session noise is too high.

---

## History page

**History** lists every session (newest first). Open **Report** for finished sessions or **Open** for one that is still in progress. You can **delete** a session from here if it was started by mistake or duplicated; deletion is permanent.

---

## Settings

### Training tiers

Here you can adjust **how strict your tier ladder is**: the percentage bands for potting, positional outcome, and rack conversion, the **balance** between those three dimensions, and the **point scale** that maps your composite performance to names like Amateur or Elite.

Tier scoring is **continuous within each configured percentage band** (not hard jumps at each boundary), so small percentage improvements produce small tier-point moves toward promotion or away from demotion.

Changes apply to the **dashboard badge** and **session report tier** going forward. A built-in **sandbox** lets you slide example percentages and see what tier would result before you save.

This is optional: default values are already sensible for many players.

### Profiles

Rename players or remove players and their data when you need to correct mistakes or reset a shared machine.

### About

Version and build information for support or curiosity.

---

## Desktop app (optional)

If you use the **desktop window** instead of a browser tab, behaviour is the same: one player at a time, same screens, same training flow. The desktop build may offer **import** of session backups you copied from another machine or older install, and a way to reveal where the app keeps your saved programs and sessions when you want to back them up. Treat imports as “bring my history here,” not as a daily action.

---

## Good habits for trustworthy data

1. **Log in the moment** — Right after the miss, before the next shot blurs memory.
2. **End every rack** — So conversion and ball-count metrics stay aligned with reality.
3. **Pause the timer** when you are not on the table.
4. **Pick honest outcomes** — “Playable” vs “pot miss” vs “no shot” should match your own standard for what counts as failure in that drill.
5. **Re-read one report per week** — Even five minutes turns numbers into a concrete plan for the next week.

---

## Summary

Elite Training is your **strict training log** and **progress mirror**: programs and plans give structure, the live screen keeps logging fast, session reports explain one day in depth, the Dashboard summarizes where you stand (optionally from a baseline you choose), and Progress shows the arc over many sessions. Used consistently, it answers whether your **precision** is actually improving — not whether you merely spent more time at the table.
