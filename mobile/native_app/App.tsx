import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Sora_400Regular, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { useEffect, useState } from "react";
import { AppStateProvider } from "./src/data/AppStateContext";
import { SplashScreen as AppSplash } from "./src/features/splash/SplashScreen";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { hasCompletedOnboarding } from "./src/features/onboarding/storage";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  return (
    <AppStateProvider>
      <Root />
    </AppStateProvider>
  );
}

function Root() {
  const [showSplash, setShowSplash] = useState(true);
  const [nativeHidden, setNativeHidden] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    let mounted = true;
    hasCompletedOnboarding()
      .then((done) => {
        if (mounted) setOnboardingDone(done);
      })
      .finally(() => {
        if (mounted) setOnboardingChecked(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
        .then(() => setNativeHidden(true))
        .catch(() => setNativeHidden(true));
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  const loading = !nativeHidden || showSplash || !onboardingChecked;

  return (
    <>
      <StatusBar style="light" />
      {loading ? <AppSplash /> : <AppNavigator initialRouteName={onboardingDone ? "Home" : "Onboarding"} />}
    </>
  );
}
