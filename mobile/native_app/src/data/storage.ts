import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppStateData, DEFAULT_APP_STATE } from "../domain/types";

const KEY = "elite_native_state_v1";

export async function loadState(): Promise<AppStateData> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_APP_STATE;
  try {
    const parsed = JSON.parse(raw) as AppStateData;
    return {
      ...DEFAULT_APP_STATE,
      ...parsed,
      settings: { ...DEFAULT_APP_STATE.settings, ...parsed.settings },
    };
  } catch {
    return DEFAULT_APP_STATE;
  }
}

export async function saveState(state: AppStateData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}
