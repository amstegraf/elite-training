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

## iOS preparation notes
- `app.json` already defines `ios.bundleIdentifier`
- `eas.json` added for EAS build flow
- Run `npx expo prebuild` when needed for native project generation
- Configure Apple signing in EAS before App Store builds

## Design reference
The implementation uses `pool-elite-prototype` as visual and flow reference for:
- hero KPI composition
- compact card spacing
- session logging interaction model
- bottom-navigation-first information architecture
