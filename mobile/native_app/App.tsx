import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { AppStateProvider } from "./src/data/AppStateContext";
import { SplashScreen as AppSplash } from "./src/features/splash/SplashScreen";
import { AppNavigator } from "./src/navigation/AppNavigator";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  return (
    <AppStateProvider>
      <Root />
    </AppStateProvider>
  );
}

import { useFonts, Sora_400Regular, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";

function Root() {
  const [showSplash, setShowSplash] = useState(true);
  const [nativeHidden, setNativeHidden] = useState(false);
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

  const loading = !nativeHidden || showSplash;

  return (
    <>
      <StatusBar style="light" />
      {loading ? <AppSplash /> : <AppNavigator />}
    </>
  );
}
