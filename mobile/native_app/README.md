# Elite Training Native

Android-first Expo React Native app with local-only training logic and data storage.

## Stack
- Expo + React Native + TypeScript
- React Navigation (tabs + stack)
- AsyncStorage persistence (repository pattern)
- Domain logic ported from Python services for KPI + tier calculations
- Vitest for domain parity tests

## Implemented screens
- Splash
- Dashboard (pot/position/conversion KPI cards + deltas + tier + start session)
- Live Session (timer, rack lifecycle, miss logging, undo)
- Session Report
- Session History
- Calendar (training day density)
- Profiles
- Settings (tier baseline controls)
- Stats (progression snapshot)

## Scripts
- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run test`

## Run on Android device (Expo Go)
1. Install Expo Go on your Android phone:
   - [Expo Go on Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Start the app from this folder:
   - `npm install`
   - `npx expo start`
3. Make sure phone and PC are on the same Wi-Fi.
4. Scan the QR code shown by Expo using Expo Go.

If the QR connection fails, try:
- `npx expo start --tunnel`
- `npx expo start --lan`

Optional (USB/emulator Android run):
- `npx expo run:android`

## iOS from Windows (iPhone, no Mac)
This project is already iOS-capable in Expo. Use EAS cloud builds for iOS from Windows.

### Prerequisites
1. Install dependencies:
   - `npm install`
2. Install EAS CLI and sign in:
   - `npm install -g eas-cli`
   - `eas login`
3. Apple setup:
   - Active Apple Developer membership
   - Bundle ID `com.elitetraining.cuepath` (already set in `app.json`)
   - Let EAS manage credentials when prompted

### Build profiles in this repo
- `development`: internal iPhone build with development client
- `preview`: internal tester build
- `simulator`: iOS simulator build artifact (requires Mac for simulator runtime)
- `production`: store/TestFlight-ready profile with auto increment

### Cloud builds (recommended)
Run from `mobile/native_app`:
- iOS preview/internal:
  - `eas build -p ios --profile preview`
- iOS development client:
  - `eas build -p ios --profile development`
- iOS production:
  - `eas build -p ios --profile production`
- Android preview/internal:
  - `eas build -p android --profile preview`

### Local EAS builds (optional)
Use local only when you specifically need local builders:
- `eas build --local -p ios --profile preview`
- `eas build --local -p android --profile preview`

For iOS, local build tooling still requires macOS + Xcode.

### Install on iPhone
1. Open the completed build link from EAS in Safari on your iPhone.
2. Install the internal build (or distribute through TestFlight for production flow).
3. Trust the profile if iOS prompts for enterprise/developer trust.

### iPhone smoke checklist
- Launch app and complete onboarding flow.
- Start a session, log misses, end rack/session, and open report.
- Verify dashboard/history/calendar/stat screens render correctly.
- Confirm persistence after app restart (session and settings data retained).
- Check bottom tab safe area and header spacing on a notch device.

### Notes
- `npm run ios` / `expo run:ios` is for local macOS/Xcode workflows.
- On Windows, prefer EAS cloud for iOS build and signing.

## Design reference
The implementation uses `pool-elite-prototype` as visual and flow reference for:
- hero KPI composition
- compact card spacing
- session logging interaction model
- bottom-navigation-first information architecture
