# Changelog

All notable changes to the native app are tracked here.

## v0.1.0-alpha (in progress)

- Live session outcome flow updated: order is now Playable → No Shot → Pot Miss, and logging Pot Miss automatically opens the end-rack balls-potted modal.
- Dashboard Recent list now shows latest 5 sessions and displays all three KPIs per row (Pot, Pos, Conversion).
- Bugfix pass: subscription Free copy updated, failure breakdown now hides 0% rows and includes scratch, live session miss selection is single-select, conversion wording standardized, and dashboard now auto-scrolls to top on focus.
- Subscription footer behavior refined: bottom area is now fixed and stable, swapping between `Current Plan` and `Upgrade CTA` in the same position to eliminate jump.
- Dashboard tier progress now shows the explicit next tier name (e.g. "877 to next tier Semi-pro") with highlighted tier text.
- Dashboard wording fix: changed KPI section title from "Last 7 days" to "Overall".
- Updated selected pool-ball highlight to a clearer light-red outer halo with spacing from the ball.
- Subscription: made upgrade CTA fixed at screen bottom so it remains visible while scrolling plans.
- Added `Previous Racks` section to live session with prototype-style cards (rack badge, pots ratio, conversion pill, split progress bar, and per-rack duration/meta).
- Live session: added state-based disabling for Start/End Rack controls and upgraded End Rack ball picker to single-row colored pool balls.
- History: improved subtitle and mini KPI text contrast for better readability.
- Subscription: fixed plan selection polish with stronger selected-state fills, removed dark selected border look, and increased bottom scroll space to improve Elite card interaction.
- Refreshed session report metric visuals to match latest prototype (Session Tier/Recovery cards, Rack Consistency mini-bars + std deviation, and enhanced Failure Breakdown with stacked bar + emphasis).
- Added new `Subscription` page based on latest prototype (Free / Pro / Elite plans UI).
- Wired first upsell redirect: session report `AI Coach` button now opens the subscription page.
- Enhanced live session feedback: object balls now mark logged misses, stats pulse on updates, and Log Miss button animates on submit.
- Added `scratch` as a selectable miss type and adjusted miss-type layout to centered 3-2 rows.
- Added session report metrics block: session label, recovery rate, rack consistency (worst/average/best), and failure breakdown chart.
- Moved `AI Coach` button to sit directly under pot/position/conversion KPI cards in session report.
- Fixed object-ball selector layout to keep balls 1-9 on a single row in live session UI.
- Updated session report with per-ball status chips (potted/miss/skipped) and legend rows per rack.
- Added `AI Coach` action button to session report layout (prototype-aligned placement/styling).
- Fixed `New Session` button in session report to create and open a live session.
- Added `Delete Session` action (with confirmation) in session report.
- Updated dev seed behavior to replace local sessions on launch when seed mode is enabled.
- Fixed seeded sessions visibility by rebinding imported sessions to active mobile profile.
- Added session import normalization and startup hydration for seeded data.
- Added dev-only desktop session seed import pipeline in APK build script.
