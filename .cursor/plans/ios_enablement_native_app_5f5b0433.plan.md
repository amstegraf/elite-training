---
name: ios_enablement_native_app
overview: Prepare `mobile/native_app` to run and ship on iOS without a rewrite, using EAS cloud builds from Windows and on-device iPhone testing. Validate compatibility, align Expo dependencies, then establish a repeatable iOS build/test/release workflow.
todos:
  - id: compat-audit
    content: Audit app code/config for iOS blockers and dependency skew; decide if any platform-specific fixes are required.
    status: completed
  - id: expo-deps-align
    content: Align Expo package versions (notably expo-font) to SDK 54 recommendations and verify clean install/test pass.
    status: completed
  - id: ios-build-profiles
    content: Define and validate iOS EAS build profiles for development/internal testing and production readiness.
    status: completed
  - id: iphone-test-flow
    content: Establish Windows + iPhone test flow (Expo Go/dev client/internal distribution), including install and smoke checklist.
    status: completed
  - id: docs-runbook
    content: Document iOS runbook and update project docs/changelog with iOS parity instructions.
    status: completed
  - id: todo-1777922194167-zo66irtds
    content: add commands like `eas build --local -p android/ios --profile preview` to readme on how to run the build on cloud with eas
    status: completed
isProject: false
---

# iOS Enablement Plan (Expo + EAS)

## Goal
Make the existing app in [c:/workspace/elite-training/mobile/native_app](c:/workspace/elite-training/mobile/native_app) iOS-ready **without creating a new app**, using EAS cloud builds from Windows and testing on a physical iPhone.

## What analysis shows
- The project is already configured as an Expo cross-platform app with iOS metadata in [c:/workspace/elite-training/mobile/native_app/app.json](c:/workspace/elite-training/mobile/native_app/app.json) and EAS config in [c:/workspace/elite-training/mobile/native_app/eas.json](c:/workspace/elite-training/mobile/native_app/eas.json).
- Source code appears platform-neutral (no meaningful Android-only logic found in `src`).
- Biggest gaps are operational/documentation, not architecture:
  - Windows cannot run local iOS Simulator/Xcode builds.
  - Existing docs are Android-first and do not provide a complete Windows+iPhone+iOS runbook.
  - There is dependency skew risk (`expo-font` vs SDK 54 expectations) in [c:/workspace/elite-training/mobile/native_app/package.json](c:/workspace/elite-training/mobile/native_app/package.json).

## Execution phases

### Phase 1 - Compatibility hardening (no rewrite)
- Reconcile Expo dependency versions with SDK 54 recommendations (especially `expo-font`) in [c:/workspace/elite-training/mobile/native_app/package.json](c:/workspace/elite-training/mobile/native_app/package.json).
- Keep/verify iOS identifiers and app metadata in [c:/workspace/elite-training/mobile/native_app/app.json](c:/workspace/elite-training/mobile/native_app/app.json).
- Confirm no hidden Android-only assumptions in core navigation/storage flows.

### Phase 2 - iOS build pipeline from Windows
- Use EAS as the primary iOS build path in [c:/workspace/elite-training/mobile/native_app/eas.json](c:/workspace/elite-training/mobile/native_app/eas.json).
- Create/confirm profile strategy:
  - internal/dev testing build for iPhone installation,
  - production profile for eventual App Store/TestFlight readiness.
- Run first iOS cloud build and verify artifact/install path for iPhone.

### Phase 3 - On-device iPhone QA baseline
- Define a focused smoke checklist for critical screens/flows (navigation, drill/session flows, persistence, safe areas, tab bar layout).
- Validate onboarding/session/report/dashboard paths on iPhone hardware.
- Track any iOS-only UI polish items as follow-up tickets.

### Phase 4 - Project documentation parity
- Expand [c:/workspace/elite-training/mobile/native_app/README.md](c:/workspace/elite-training/mobile/native_app/README.md) with a dedicated “iOS from Windows” section:
  - prerequisites (Apple Developer account, EAS auth),
  - build command flow,
  - install/testing flow on iPhone,
  - common troubleshooting.
- Add iOS enablement note in [c:/workspace/elite-training/mobile/native_app/CHANGELOG.md](c:/workspace/elite-training/mobile/native_app/CHANGELOG.md).

## Environment constraints acknowledged
- Since you currently have **no Mac** and **do have iPhone**, the initial milestone will be **on-device iPhone validation via EAS build/install**.
- iOS Simulator remains optional future work once macOS access is available.

## Success criteria
- iOS build is generated via EAS and installs successfully on your iPhone.
- Core app flows complete without platform-breaking issues.
- README contains a repeatable iOS runbook for your Windows-based workflow.
- No second app/rewrite is required; this codebase remains the single cross-platform app.