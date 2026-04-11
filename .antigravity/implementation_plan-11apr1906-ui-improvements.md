# UX Enhancement Plan: Pool Precision v1

This plan details the next phase of UX and UI improvements for the Elite Training application. It focuses on aligning the new v1 features (miss-only tracking) with the requested "premium, soft, and intuitive" design language. The goal is to maximize the signal-to-noise ratio in the UI and ensure a highly polished user experience.

## User Review Required

> [!IMPORTANT]
> Please review the proposed changes to the Dashboard and Live Session flows below. Let me know if you would prefer to keep program/plan creation visible at all times on the dashboard, or if moving them to dedicated modals/subpages (to clean up the main view) aligns better with your vision.

## Proposed Changes

---

### Dashboard (Program & Session Selection)

Currently, the dashboard displays raw forms for creating programs, creating plans, and starting sessions all at once. This creates an overwhelming cognitive load on the landing page. We will streamline this.

#### [MODIFY] `templates/dashboard/index.html`
- **Hero Section:** Focus the eye on the *Active Program*. Show a primary, highly styled metric for "Days Remaining" or "Current Phase".
- **Primary CTA:** Make "Start Session" the most prominent unified flow on the page, rather than a form at the bottom right.
- **Creation Flows:** Move "New Program" and "Add Plan" forms into clean, separate modal dialogs (using the newly created `<dialog class="modal">` standards) to declutter the dashboard.

#### [MODIFY] `static/css/dashboard/dashboard.css`
- Apply the wavy, pastel background styles (`.stat-card--pr`, `.stat-card--fr`) previously defined to the active program summary card.
- Add CSS-only horizontal progress bars or ring charts to visualize program progress cleanly.

---

### Live Session HUD

The Miss Dialog is now polished, but the underlying HUD needs to establish a stronger visual hierarchy centered around the core action: Logging a Miss.

#### [MODIFY] `templates/session/live.html`
- **Stats Refinement:** Convert "Current Rack" and "Misses" to use the premium `.stat-card` styling for enhanced visual weight.
- **Log Miss CTA:** Redesign the `btn-log-miss` into a massive, centralized soft-gradient button with a subtle pulse animation if a streak is getting high, making it the tactile focal point of the screen.

#### [MODIFY] `static/css/session/session.css`
- Add gradient and shadow design tokens specifically for the primary CTA.
- Style the `rules-banner` dynamically (e.g., turning orange at 2 misses, red at 3 misses) to draw attention to performance breakdowns.

---

### Session Report

The post-session report must answer "Where do I fail?" and "Why do I fail?" without overwhelming the user with raw data.

#### [MODIFY] `templates/session/report.html` (or create if missing)
- **KPI Row:** Add a top row of premium stat cards showing "Avg Balls Cleared", "Total Misses", and "Best Run".
- **Failure Breakdown:** Introduce a pure-CSS horizontal bar breakdown showing the distribution of `Position`, `Alignment`, `Delivery`, and `Speed` misses. This avoids adding heavy charting libraries while still providing immediate visual feedback.

#### [MODIFY] `static/css/reports/reports.css`
- Implement the `.css-bar-chart` utility classes for the failure breakdown layout.

## Open Questions

> [!WARNING]
> 1. **Automated "End Rack":** When the user logs a miss, do we want a prompt that asks if the rack ended (e.g., they missed on the 8-ball and the opponent cleared), or do they manually click "End Rack" right after?
> 2. **Session Persistence:** Should we add a toast notification or subtle autosave indicator during the Live Session so the user feels confident their misses are being stored locally?

## Verification Plan

### Manual Verification
- Deploy the frontend changes and navigate the "golden path": Dashboard -> Create Program (via Modal) -> Start Session -> Log Misses -> End Session -> View Report.
- Inspect the visual hierarchy: Ensure the "Log Miss" CTA is unmissable on mobile screens.
- Validate that moving "Create Program/Plan" out of the main flow significantly reduces visual clutter on the Dashboard.
