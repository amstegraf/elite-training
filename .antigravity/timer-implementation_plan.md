# Session Progression V1 Implementation Plan

This plan scopes the addition of a stopwatch timer (that tracks total elapsed actual active time) during the live session alongside restricting the system entirely to a 9-ball domain.

## Goal Description
1. **Live Session Timer**: Implement an interactive timer in the HUD that counts up while active. Provide Pause / Play controls. Save the accumulated training duration against the session context so it persists correctly if they reload the page and ends up in reports.
2. **Global 9-ball Enforcement**: Update all existing references from a 15-ball maximum to an exclusive 9-ball maximum. This applies to UI dropdowns, HTML inputs, domain Models, and default clearing logic.

## User Review Required

> [!WARNING]
> This will alter the core `PrecisionSession` model to track `duration_seconds` and `is_paused` flags. Since this is JSON backup backed, previously completed sessions will not have a value. I plan to default `duration_seconds` to 0 to avoid breaking backward compatibility. Does this sound correct?

## Proposed Changes

---

### Phase 1: Domain Model Updates

#### [MODIFY] `app/models.py`
Add time tracking attributes to `PrecisionSession`:
- `duration_seconds: int = 0`
- `is_paused: bool = False`
- `last_unpaused_at: Optional[str] = None`
- Alter `MissEvent`, `RackRecord`, and `EndRackBody` fields to have `le=9` instead of `le=15`.

---

### Phase 2: Service & API Routing

#### [MODIFY] `app/services/session_service.py`
- Modify `start_session` to initialize `last_unpaused_at = utc_now_iso()`.
- Create a new method `toggle_session_pause(session_id: str, pause: bool) -> PrecisionSession` which updates `duration_seconds` and `last_unpaused_at`.
- Modify `end_session` so that if `is_paused` is False, it adds the pending time to `duration_seconds`.
- Add a helper to compute `live_duration(session)` -> calculated duration counting the time currently running (if not paused), which `api_live()` will return to the frontend.

#### [MODIFY] `app/routers/api_sessions.py`
- Add a new route `@router.post("/{session_id}/pause")` taking a payload indicating `pause: bool`.

#### [MODIFY] `app/services/derived_metrics.py`
- Change `max=15` loops and bounds to `max=9`.
- Any `default_balls_cleared` logic caps at 9.

---

### Phase 3: Frontend Updates

#### [MODIFY] `templates/session/live.html`
- Adjust `<input type="number" ... max="15">` to `max="9"` across forms.
- Re-architect the `hud-stats-row` to include a 3rd `stat-card` containing a digital stopwatch (e.g., `00:00:00`) alongside inline Play/Pause buttons.

#### [MODIFY] `static/js/session/live.js`
- Create a `setInterval` that increments the HUD timer every second if `live.session.is_paused` is false.
- Wire up generic event listeners for the Play/Pause buttons that trigger `POST /api/sessions/{id}/pause`.
- Bind UI input logic to default to 9 instead of 15.

#### [MODIFY] `templates/session/report.html` and `dashboard/index.html`
- Show the logged Session Duration on the reports and dashboard history tables if `duration_seconds` > 0.

## Verification Plan

- **Manual Testing:**
  1. Start a session and watch the timer count up automatically.
  2. Click Pause. Verify the timer stops counting immediately.
  3. Reload the page while paused. Ensure the timer renders the exact paused value correctly.
  4. Resume the timer and ensure it picks up from the paused value correctly.
  5. Attempt to record an error on "Ball 10" and confirm the frontend validation prevents it, restricting to 9 balls.
  6. Ensure ending a rack naturally defaults max cleared to 9 if no errors exist.
