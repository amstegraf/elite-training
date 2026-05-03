# Recreate Web Prototype UI in React Native

The objective is to make the `mobile/native_app` (Expo React Native) visually identical to the web prototype found in `pool-elite-prototype` (and corresponding screenshots), focusing strictly on aesthetics with no functional backend or logic integration.

## Proposed Changes

### 1. Dependencies and Assets

To match the web prototype perfectly, we will install the missing fonts and icons:
- Add `lucide-react-native` for icons.
- Add `expo-font`, `@expo-google-fonts/sora`, and `@expo-google-fonts/inter` for typography.

#### [MODIFY] package.json
Add the required dependencies and update `App.tsx` to asynchronously load `Sora` and `Inter` fonts during the splash screen phase.

### 2. Core Theme Updates

#### [MODIFY] src/core/theme/theme.ts
Map the HSL variables from `pool-elite-prototype/src/index.css` (the light theme) to standard HSL/Hex variables in the React Native theme file so all styles can reference standard tokens (e.g., `colors.primary`, `colors.background`, `colors.tierGold`).

### 3. Reusable UI Components

We will recreate the custom components found in the Vite prototype's `src/components` directly into `src/ui/`.

#### [NEW] src/ui/AppHeader.tsx
#### [NEW] src/ui/KpiCard.tsx
#### [NEW] src/ui/TierBadge.tsx

### 4. Navigation & Tab Bar

#### [MODIFY] src/navigation/AppNavigator.tsx
Redesign the bottom tab navigator to match `BottomNav.tsx` from the Vite prototype. This involves:
- Using the new Lucide icons.
- Applying the correct active/inactive colors.
- Adjusting the tab bar background and layout styles.

### 5. Screen Overhauls

We will rewrite the feature screens to map the Tailwind CSS classes from the Vite prototype into React Native `StyleSheet` definitions, applying the same flexbox layouts, borders, radii, and gradients.

#### [MODIFY] src/features/dashboard/DashboardScreen.tsx
#### [MODIFY] src/features/session/SessionScreen.tsx
#### [MODIFY] src/features/report/SessionReportScreen.tsx
#### [MODIFY] src/features/history/SessionHistoryScreen.tsx
#### [MODIFY] src/features/calendar/CalendarScreen.tsx
#### [MODIFY] src/features/profiles/ProfilesScreen.tsx
#### [MODIFY] src/features/settings/SettingsScreen.tsx
#### [MODIFY] src/features/stats/StatsScreen.tsx

## Verification Plan

### Automated Tests
Run the TypeScript compiler (`tsc`) to ensure no syntax or typing errors were introduced.

### Manual Verification
- Run `npm start` in `mobile/native_app` and open it on an Android/iOS emulator or web preview.
- Compare each screen visually side-by-side with the provided `mobile-*.png` screenshots.
- Ensure that gradients, shadows, and custom fonts load properly.
