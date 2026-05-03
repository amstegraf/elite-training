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
      const timer = setTimeout(async () => {
        setShowSplash(false);
        await SplashScreen.hideAsync();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  const loading = showSplash;

  return (
    <>
      <StatusBar style="light" />
      {loading ? <AppSplash /> : <AppNavigator />}
    </>
  );
}
