import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_DONE_KEY = "cuepath.onboarded";

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
  return value === "1";
}

export async function markOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "1");
}
