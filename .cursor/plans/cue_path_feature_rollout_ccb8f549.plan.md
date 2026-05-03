---
name: Cue Path Feature Rollout
overview: Implement feature-complete mobile functionality on top of the current prototype-aligned UI by wiring every screen to real local state and domain calculations, without changing the established design language.
todos:
  - id: wire-data-foundation
    content: Extend AppStateContext and domain selectors so all screens can consume real persisted data.
    status: completed
  - id: implement-live-session-flow
    content: Connect Session screen controls to real session/rack/miss lifecycle actions.
    status: completed
  - id: ship-report-history-integration
    content: Replace mock report/history data with computed session-backed data and navigation params.
    status: completed
  - id: ship-calendar-stats-real-data
    content: Generate calendar heatmap and stats series from completed sessions with range/month controls.
    status: completed
  - id: complete-profiles-settings
    content: Bind Profiles and Settings screens to real state updates and persistence while preserving design.
    status: completed
  - id: qa-and-tests
    content: Add/expand domain tests and run TS/test validation for regression safety.
    status: completed
isProject: false
---

# Cue Path Feature Implementation Plan

## Goal
Ship the next milestone of `mobile/native_app` by keeping the current prototype-aligned design intact and replacing placeholder/demo behavior with fully functional offline features.

## Current vs Target (Gap Map)
- **Dashboard** (`[mobile/native_app/src/features/dashboard/DashboardScreen.tsx](mobile/native_app/src/features/dashboard/DashboardScreen.tsx)`): currently hardcoded KPIs/tier/recent sessions; target is live metrics from `AppStateContext` + real session actions.
- **Live Session** (`[mobile/native_app/src/features/session/SessionScreen.tsx](mobile/native_app/src/features/session/SessionScreen.tsx)`): currently local demo state only; target is actual rack/session lifecycle (`startRack`, `logMiss`, `endRack`, `undo`, `endSession`).
- **Session Report** (`[mobile/native_app/src/features/report/SessionReportScreen.tsx](mobile/native_app/src/features/report/SessionReportScreen.tsx)`): currently mock rack timeline; target is computed report from selected completed session.
- **History** (`[mobile/native_app/src/features/history/SessionHistoryScreen.tsx](mobile/native_app/src/features/history/SessionHistoryScreen.tsx)`): currently static list/filters; target is data-backed session list, filter/sort, report drill-in.
- **Calendar** (`[mobile/native_app/src/features/calendar/CalendarScreen.tsx](mobile/native_app/src/features/calendar/CalendarScreen.tsx)`): currently static May heatmap; target is generated month heatmap from completed sessions + streak logic.
- **Stats** (`[mobile/native_app/src/features/stats/StatsScreen.tsx](mobile/native_app/src/features/stats/StatsScreen.tsx)`): currently hardcoded trend series; target is computed progression series by range from real sessions.
- **Profiles** (`[mobile/native_app/src/features/profiles/ProfilesScreen.tsx](mobile/native_app/src/features/profiles/ProfilesScreen.tsx)`): currently static players; target is real profile CRUD + active profile switching.
- **Settings** (`[mobile/native_app/src/features/settings/SettingsScreen.tsx](mobile/native_app/src/features/settings/SettingsScreen.tsx)`): toggles are local UI-only; target is persisted app preferences + tier baseline edits bound to settings state.

## Implementation Tracks

### 1) Data-Flow Foundation (Design-Preserving Wiring)
- Expand state actions in `[mobile/native_app/src/data/AppStateContext.tsx](mobile/native_app/src/data/AppStateContext.tsx)` for profile management, session selection, and UI preference settings (while keeping existing tier/domain logic).
- Add selector helpers in `[mobile/native_app/src/domain/metrics.ts](mobile/native_app/src/domain/metrics.ts)` for:
  - per-session KPIs,
  - report-ready rack summaries,
  - calendar aggregation by day/month,
  - stats time-series windows.
- Keep persistence in `[mobile/native_app/src/data/storage.ts](mobile/native_app/src/data/storage.ts)` as single source of truth; version key if schema extends.

### 2) Session Lifecycle End-to-End
- Wire Dashboard CTA to create/resume a live session.
- In Session screen, map controls to context actions:
  - start rack,
  - select ball + miss type(s) + outcome,
  - log miss,
  - undo last miss,
  - end rack with balls-cleared dialog,
  - end session and navigate to report.
- Preserve current card/chip/hero visuals; only replace state and handlers.

### 3) Real Report + History
- Pass selected session ID through navigation params in `[mobile/native_app/src/navigation/AppNavigator.tsx](mobile/native_app/src/navigation/AppNavigator.tsx)` and read it in report screen.
- Build report data from stored session records (KPI trio, rack-by-rack outcomes, timeline/miss markers).
- Replace history mock list with completed sessions from context; keep chips and card design, make filters functional.

### 4) Calendar + Stats from Live Data
- Calendar: compute day density (session count/day), monthly totals, and streak from completed sessions; support month navigation.
- Stats: generate trend series for Pot/Position/Conversion/Points by selected range (`1W`, `1M`, `3M`, `6M`, `1Y`) and feed existing chart UI.
- Keep visual components as-is; only supply dynamic datasets and empty-state handling.

### 5) Profiles + Settings Completion
- Profiles: bind list to real profiles, add profile creation UI flow, active profile toggle, optional rename/delete safeguards.
- Settings: persist toggles and language placeholder selection; bind tier baseline sliders to `settings.tier` via existing update path.
- Update app name/version labels to `Cue Path` consistency where still legacy text exists.

### 6) Quality + Safety Gates
- Add/extend tests in:
  - `[mobile/native_app/src/domain/metrics.test.ts](mobile/native_app/src/domain/metrics.test.ts)` (calendar/stats/report selectors),
  - `[mobile/native_app/src/domain/tier.test.ts](mobile/native_app/src/domain/tier.test.ts)` (settings impact),
  - minimal interaction tests for critical reducers/actions if test stack allows.
- Run TypeScript and unit tests after each track; verify no design regressions by keeping changes in logic/handlers/components only.

## Delivery Phases
- **Phase A:** data foundation + navigation params.
- **Phase B:** session lifecycle + report/history.
- **Phase C:** calendar/stats + profiles/settings.
- **Phase D:** test pass, polish copy consistency, and manual QA checklist for Android emulator/device.

## Non-Negotiables
- Preserve current prototype-aligned design and component structure.
- No web-server dependency; all logic and data remain on-device.
- Keep Android-first behavior while maintaining iOS-ready architecture.