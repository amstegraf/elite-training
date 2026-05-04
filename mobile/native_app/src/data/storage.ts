import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppStateData, DEFAULT_APP_STATE } from "../domain/types";

const KEY = "cue_path_state_v2";

export async function loadState(): Promise<AppStateData> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_APP_STATE;
  try {
    const parsed = JSON.parse(raw) as AppStateData;
    return {
      ...DEFAULT_APP_STATE,
      ...parsed,
      drillResults: Array.isArray(parsed.drillResults) ? parsed.drillResults : DEFAULT_APP_STATE.drillResults,
      settings: {
        ...DEFAULT_APP_STATE.settings,
        ...parsed.settings,
        tier: {
          ...DEFAULT_APP_STATE.settings.tier,
          ...parsed.settings?.tier,
        },
        preferences: {
          ...DEFAULT_APP_STATE.settings.preferences,
          ...parsed.settings?.preferences,
        },
      },
    };
  } catch {
    return DEFAULT_APP_STATE;
  }
}

export async function saveState(state: AppStateData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}
