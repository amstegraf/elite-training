# Changelog

All notable changes to the native app are tracked here.

## v0.1.0-alpha (in progress)

- Fixed object-ball selector layout to keep balls 1-9 on a single row in live session UI.
- Updated session report with per-ball status chips (potted/miss/skipped) and legend rows per rack.
- Added `AI Coach` action button to session report layout (prototype-aligned placement/styling).
- Fixed `New Session` button in session report to create and open a live session.
- Added `Delete Session` action (with confirmation) in session report.
- Updated dev seed behavior to replace local sessions on launch when seed mode is enabled.
- Fixed seeded sessions visibility by rebinding imported sessions to active mobile profile.
- Added session import normalization and startup hydration for seeded data.
- Added dev-only desktop session seed import pipeline in APK build script.
