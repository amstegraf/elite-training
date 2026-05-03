# Web/Desktop Functional Behavior Spec (Exhaustive)

This document describes the current **functional behavior** of the web/desktop app, feature by feature, focusing on what users can do, what the app shows, and the rules that govern behavior.

---

## 1) Dashboard

### What user sees and can do

- Hero area:
  - Current tier label and points.
  - Progress within tier and points to next tier.
  - Continue button if an in-progress session exists.

- KPI cards:
  - Pot success %
  - Position outcome %
  - Rack conversion %
  - Trend direction badges (up/down/flat)
  - Baseline delta labels where available.

- Session start:
  - Choose plan.
  - Choose table type.
  - Choose mode.
  - Submit starts session and redirects to live page.

- Program/plan management:
  - Create program.
  - Add plan to program.
  - Set active program.

- Recent sessions table:
  - Open in-progress session.
  - Open report for completed session.
  - Set reference baseline session.
  - Clear baseline reference.

### Edge/validation

- No active profile: dashboard renders without session-driven metrics.
- Invalid start session request redirects with `?err=start`.
- Invalid reference-session id is ignored and cookie can be cleared.

---

## 2) Live Session

### Top-level behavior

- If session is completed, live route redirects to report.
- Polls refresh every ~2.5s when tab is visible.
- Shows:
  - Current rack label.
  - Session miss total.
  - Effective duration timer.
  - Latest misses feed.
  - Rules banner based on consecutive run-breaking misses.

### Live controls and exact interactions

- **Pause timing**
  - Button toggles pause/resume.
  - Optimistic UI; reverts on request failure.

- **Log Miss**
  - Opens miss modal.
  - Payload:
    - `ballNumber`
    - `types[]`
    - `outcome`

- **Undo last miss**
  - Confirms first.
  - Removes latest miss by timestamp across rack set.

- **End rack**
  - Opens rack-end modal.
  - UI lets user select potted balls.
  - Submission sends a count (`ballsCleared`).

- **Start next rack**
  - Starts a new rack when no rack is currently open.

- **End session**
  - Server rejects if current rack still open.
  - On success redirects to report page.

### Rules banner semantics

- Rules summary comes from `session_rules_summary`:
  - Warn threshold.
  - Reset suggestion threshold.
- Consecutive misses are based on run-breaking misses only (`pot_miss`, legacy `both`).

---

## 3) Miss Logging Modal (click-level)

### Ball selection behavior

- Balls are radio buttons 1..9.
- User must choose exactly one ball before submit (`required`).
- Suggested next ball is pushed into form by live refresh:
  - derived from latest rack state.

### Miss types behavior

- Types are checkboxes:
  - `position`, `alignment`, `delivery`, `speed`
- User can select one or many.
- Server enforces at least one type:
  - Returns error if empty.

### Outcome behavior

- Outcomes are radios:
  - `playable`
  - `pot_miss`
  - `no_shot_position`
- Required before submit.
- Legacy `both` exists in model only for backward compatibility.

### Persistence and metric impact

- Each miss saved as `MissEvent`.
- Session/report aggregates are recomputed after each mutation.

---

## 4) End Rack Modal (ball-click details)

### Interaction details

- User toggles ball chips 1..9.
- Running count shown in modal.
- Confirm sends only **count of selected balls**.

### Auto-prefill details

- On modal open, JS prechecks based on local heuristic:
  - Uses suggested next ball and logged run-breaking misses.

### Server behavior

- Rack is closed with `ended_at`.
- `balls_cleared` is set from request count (if provided).
- If omitted, default inference uses first run-breaking miss ball.

---

## 5) Session Report

### User-visible behavior

- Displays session KPIs and derived indicators.
- Rack-by-rack section with ball timeline visuals.
- Ball cells can show miss overlays and custom tooltip details.
- AI analysis button and modal.
- Delete session button.
- Ended rack inline edit (balls cleared) via modal-like flow.

### Rack timeline interactions

- Tooltip appears on relevant cells (miss-focused behavior).
- Tooltip content includes miss type/outcome details.
- Cup icon for run-out conditions as implemented in timeline rendering/template logic.

### Rack edit behavior

- Edit action available on ended rack rows.
- User selects potted balls in dialog-like UI.
- Save updates rack `ballsCleared`.
- Recomputes aggregates server-side.

### Delete behavior

- Removes session from persistence and redirects.

---

## 6) History

### Behavior

- Server-rendered list of sessions (active profile scoped).
- Row actions:
  - Open live for in-progress sessions.
  - Open report for completed sessions.
  - Delete session with confirm.

---

## 7) Progress Page

### Behavior

- Server embeds JSON blob of progression series.
- Charts include trend/consistency distributions and KPI evolution.
- Uses same profile and (if set) reference-session filtering logic.
- AI analysis available for progress scope.

---

## 8) Settings (Tiers)

### Behavior

- User edits tier baseline % values, weights, penalty factor.
- Saves through standard settings form flow.
- On save error, page rerenders with validation message and status 422.
- Client sandbox approximates backend scoring and point/tier cuts.

---

## 9) Settings (AI Mesh / Coach Backend)

### Behavior

- Edit and save mesh base URL.
- Optional system instruction override.
- Reset instructions action.
- Health test button pings mesh-health API.
- Instructions preview fetched from API.

- Health check reports unavailable when mesh is not healthy or unreachable.
- Instructions preview loads current instruction payload.

---

## 10) AI Coach (Session + Progress)

### UI behavior

- AI buttons start in pending/loading while availability is checked.
- If mesh unavailable and no cached response:
  - button disabled and marked offline.
- If mesh available or cache exists:
  - button enabled.
- Run analysis opens modal, displays markdown-like response text.
- Regenerate option requests fresh run.
- Copy-to-clipboard action in modal.

### Scope behavior

- Session scope requires `sessionId`.
- Progress scope can be filtered by dashboard reference-session cookie.

---

## 11) Mobile Pairing QR (from Live Session page)

### Behavior

- Show QR opens connect panel.
- Generate/refresh issues a fresh pairing token.
- UI displays:
  - QR image (data URL)
  - manual connect URL fallback
  - token expiry label
- Copy URL action supported.

### Data details

- Deep link and fallback URL included.
- TTL defaults to configured value (currently extended to hours).
- If QR image generation lib unavailable, fallback URL still works.

---

## 12) Profiles and Active Profile Switching

### Behavior

- Profile switch from sidebar posts active profile id.
- First profile creation flow when no profiles exist.
- Add profile flow from modal.
- Profile settings page supports rename/delete actions.

---

## 13) Canonical Metric Semantics (web/desktop baseline)

- **Run-breaking miss**:
  - true when outcome is `pot_miss` (legacy `both` supported in backend models).

- **ballsCleared inference**
  - no misses -> 9
  - first run-breaking miss on ball N -> N-1
  - only soft misses (no run break) -> inference can be null in certain paths.

- **Pot success**
  - potted balls / (potted balls + pot-miss outcomes).

- **Position success**
  - `1 - (position_related_misses / balls_cleared)`
  - position-related if:
    - outcome is `no_shot_position` (or legacy both), or
    - miss tags include `position` or `speed`.

- **Rack conversion**
  - completed racks with `ballsCleared == 9` / ended racks.

- **Recovery metrics**
  - training miss followed by non-breaking continuation considered recovery.

---

## 14) Important Validation/Guard Rules

- Session mutations require in-progress session state.
- Cannot end session with open rack.
- Cannot add miss to closed rack.
- Miss requires at least one type.
- Ball number constrained to 1..9.
- Rack edit (`PATCH`) requires rack already ended.
- Profile scoping enforced for desktop session access.

---

## 15) Native recreation usage

Use this document as the functional baseline for parity:

- First replicate behavior exactly (same validations and state transitions).
- Then apply mobile UX adaptations without changing core semantics.
- Any intentional divergence should be documented per feature.

