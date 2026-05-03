import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  baselineComparison,
  computeGlobalMetrics,
  defaultBallsClearedForRack,
  isoNow,
  uid,
} from "../domain/metrics";
import { computeTier } from "../domain/tier";
import {
  AppStateData,
  DEFAULT_APP_STATE,
  MissEvent,
  MissOutcome,
  MissType,
  PrecisionSession,
  Profile,
  TierSettings,
  UiPreferences,
} from "../domain/types";
import { DEV_SEED_ENABLED, DEV_SEED_SESSIONS, DEV_SEED_SOURCE } from "../dev/seedSessions.generated";
import { importDesktopSessions } from "../dev/seedImport";
import { loadState, saveState } from "./storage";

type AppStateContextValue = {
  ready: boolean;
  data: AppStateData;
  activeProfile: Profile | null;
  activeSessions: PrecisionSession[];
  completedSessions: PrecisionSession[];
  global: ReturnType<typeof computeGlobalMetrics>;
  baseline: ReturnType<typeof baselineComparison>;
  tier: ReturnType<typeof computeTier>;
  createProfile: (name: string) => void;
  setActiveProfile: (id: string) => void;
  startSession: () => string | null;
  endSession: (sessionId: string) => void;
  startRack: (sessionId: string) => void;
  endRack: (sessionId: string, ballsCleared?: number) => void;
  logMiss: (
    sessionId: string,
    ballNumber: number,
    types: MissType[],
    outcome: MissOutcome
  ) => void;
  undoLastMiss: (sessionId: string) => void;
  updateTierSetting: (key: keyof AppStateData["settings"]["tier"], value: unknown) => void;
  updateTierBounds: (
    key: "potPctLowerBounds" | "posPctLowerBounds" | "convPctLowerBounds",
    index: number,
    value: number
  ) => void;
  updatePreference: (key: keyof UiPreferences, value: UiPreferences[keyof UiPreferences]) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  deleteSession: (sessionId: string) => void;
  toggleSessionPause: (sessionId: string, pause: boolean) => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

function withDefaultProfile(state: AppStateData): AppStateData {
  if (state.profiles.length > 0) return state;
  const profile: Profile = { id: uid(), name: "Player 1", createdAt: isoNow() };
  return { ...state, profiles: [profile], activeProfileId: profile.id };
}

function withDevSeedSessions(state: AppStateData): AppStateData {
  if (!DEV_SEED_ENABLED) return state;
  const profileId = state.activeProfileId ?? state.profiles[0]?.id;
  if (!profileId) return state;
  const imported = importDesktopSessions(DEV_SEED_SESSIONS, profileId);
  if (!imported.length) return state;
  // In dev-seed mode, always replace local sessions to avoid stale restored app data.
  void DEV_SEED_SOURCE;
  return { ...state, sessions: imported };
}

function withSession(
  sessions: PrecisionSession[],
  sessionId: string,
  updater: (s: PrecisionSession) => PrecisionSession
): PrecisionSession[] {
  return sessions.map((s) => (s.id === sessionId ? updater(s) : s));
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppStateData>(DEFAULT_APP_STATE);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadState();
        const withProfile = withDefaultProfile(loaded);
        setData(withDevSeedSessions(withProfile));
      } catch {
        const withProfile = withDefaultProfile(DEFAULT_APP_STATE);
        setData(withDevSeedSessions(withProfile));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveState(data);
  }, [data, ready]);

  const activeProfile = useMemo(
    () => data.profiles.find((p) => p.id === data.activeProfileId) ?? null,
    [data.activeProfileId, data.profiles]
  );
  const sessionsForActive = useMemo(
    () => data.sessions.filter((s) => s.profileId === data.activeProfileId),
    [data.activeProfileId, data.sessions]
  );
  const activeSessions = sessionsForActive.filter((s) => s.status === "in_progress");
  const completedSessions = sessionsForActive.filter((s) => s.status === "completed");
  const global = useMemo(() => computeGlobalMetrics(completedSessions), [completedSessions]);
  const baseline = useMemo(() => baselineComparison(completedSessions), [completedSessions]);
  const tier = useMemo(
    () =>
      computeTier(global.potRate, global.positionRate, global.rackConversionRate, data.settings.tier),
    [data.settings.tier, global]
  );

  const createProfile = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const p: Profile = { id: uid(), name: trimmed, createdAt: isoNow() };
    setData((prev) => ({
      ...prev,
      profiles: [...prev.profiles, p],
      activeProfileId: prev.activeProfileId ?? p.id,
    }));
  };

  const setActiveProfile = (id: string) => setData((prev) => ({ ...prev, activeProfileId: id }));

  const renameProfile = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
    }));
  };

  const deleteProfile = (id: string) => {
    setData((prev) => {
      if (prev.profiles.length <= 1) return prev;
      const profiles = prev.profiles.filter((p) => p.id !== id);
      const sessions = prev.sessions.filter((s) => s.profileId !== id);
      const activeProfileId =
        prev.activeProfileId === id ? profiles[0]?.id ?? undefined : prev.activeProfileId;
      return { ...prev, profiles, sessions, activeProfileId };
    });
  };

  const deleteSession = (sessionId: string) => {
    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((session) => session.id !== sessionId),
    }));
  };

  const startSession = (): string | null => {
    if (!data.activeProfileId) return null;
    const rack = { id: uid(), rackNumber: 1, startedAt: isoNow(), misses: [] };
    const s: PrecisionSession = {
      id: uid(),
      profileId: data.activeProfileId,
      startedAt: isoNow(),
      status: "in_progress",
      durationSeconds: 0,
      isPaused: false,
      lastUnpausedAt: isoNow(),
      totalMisses: 0,
      racks: [rack],
      currentRackId: rack.id,
    };
    setData((prev) => ({ ...prev, sessions: [s, ...prev.sessions] }));
    return s.id;
  };

  const endSession = (sessionId: string) => {
    setData((prev) => ({
      ...prev,
      sessions: withSession(prev.sessions, sessionId, (s) => {
        if (s.currentRackId) return s;
        const now = isoNow();
        const delta = !s.isPaused && s.lastUnpausedAt
          ? Math.max(0, Math.floor((new Date(now).getTime() - new Date(s.lastUnpausedAt).getTime()) / 1000))
          : 0;
        return {
          ...s,
          status: "completed",
          endedAt: now,
          durationSeconds: (s.durationSeconds ?? 0) + delta,
          isPaused: true,
          lastUnpausedAt: now,
          currentRackId: undefined,
        };
      }),
    }));
  };

  const startRack = (sessionId: string) => {
    setData((prev) => ({
      ...prev,
      sessions: withSession(prev.sessions, sessionId, (s) => {
        if (s.currentRackId) return s;
        const nextNo = s.racks.length + 1;
        const rack = { id: uid(), rackNumber: nextNo, startedAt: isoNow(), misses: [] };
        return { ...s, racks: [...s.racks, rack], currentRackId: rack.id };
      }),
    }));
  };

  const endRack = (sessionId: string, ballsCleared?: number) => {
    setData((prev) => ({
      ...prev,
      sessions: withSession(prev.sessions, sessionId, (s) => {
        const rack = s.racks.find((r) => r.id === s.currentRackId);
        if (!rack) return s;
        const inferred = defaultBallsClearedForRack(rack);
        const safeBalls =
          typeof ballsCleared === "number"
            ? Math.max(0, Math.min(9, Math.round(ballsCleared)))
            : (inferred ?? 0);
        return {
          ...s,
          racks: s.racks.map((r) =>
            r.id === s.currentRackId ? { ...r, endedAt: isoNow(), ballsCleared: safeBalls } : r
          ),
          currentRackId: undefined,
        };
      }),
    }));
  };

  const logMiss = (
    sessionId: string,
    ballNumber: number,
    types: MissType[],
    outcome: MissOutcome
  ) => {
    const miss: MissEvent = {
      id: uid(),
      ballNumber,
      types,
      outcome,
      createdAt: isoNow(),
    };
    setData((prev) => ({
      ...prev,
      sessions: withSession(prev.sessions, sessionId, (s) => {
        if (!s.currentRackId) return s;
        return {
          ...s,
          racks: s.racks.map((r) =>
            r.id === s.currentRackId ? { ...r, misses: [...r.misses, miss] } : r
          ),
        };
      }),
    }));
  };

  const undoLastMiss = (sessionId: string) => {
    setData((prev) => ({
      ...prev,
      sessions: withSession(prev.sessions, sessionId, (s) => {
        let latestRackIdx = -1;
        let latestMissIdx = -1;
        let latestAt = "";
        s.racks.forEach((rack, rackIdx) => {
          rack.misses.forEach((m, missIdx) => {
            const at = m.createdAt ?? "";
            if (at >= latestAt) {
              latestAt = at;
              latestRackIdx = rackIdx;
              latestMissIdx = missIdx;
            }
          });
        });
        if (latestRackIdx < 0 || latestMissIdx < 0) return s;
        const racks = s.racks.map((r, idx) =>
          idx === latestRackIdx
            ? { ...r, misses: r.misses.filter((_, i) => i !== latestMissIdx) }
            : r
        );
        return { ...s, racks };
      }),
    }));
  };

  const toggleSessionPause = (sessionId: string, pause: boolean) => {
    setData((prev) => ({
      ...prev,
      sessions: withSession(prev.sessions, sessionId, (s) => {
        if (s.status !== "in_progress") return s;
        if ((s.isPaused ?? false) === pause) return s;
        const now = isoNow();
        if (pause) {
          const delta = s.lastUnpausedAt
            ? Math.max(0, Math.floor((new Date(now).getTime() - new Date(s.lastUnpausedAt).getTime()) / 1000))
            : 0;
          return {
            ...s,
            isPaused: true,
            durationSeconds: (s.durationSeconds ?? 0) + delta,
          };
        }
        return {
          ...s,
          isPaused: false,
          lastUnpausedAt: now,
        };
      }),
    }));
  };

  const updateTierSetting = (
    key: keyof AppStateData["settings"]["tier"],
    value: unknown
  ) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        tier: {
          ...prev.settings.tier,
          [key]: value as never,
        },
      },
    }));
  };

  const updateTierBounds = (
    key: "potPctLowerBounds" | "posPctLowerBounds" | "convPctLowerBounds",
    index: number,
    value: number
  ) => {
    setData((prev) => {
      const current = [...prev.settings.tier[key]] as number[];
      current[index] = Math.max(0, Math.min(100, Math.round(value)));
      const sorted = current.map((v, i) =>
        i === 0 ? v : Math.max(v, current[i - 1] + 1)
      ) as TierSettings[typeof key];
      return {
        ...prev,
        settings: {
          ...prev.settings,
          tier: {
            ...prev.settings.tier,
            [key]: sorted,
          },
        },
      };
    });
  };

  const updatePreference = (
    key: keyof UiPreferences,
    value: UiPreferences[keyof UiPreferences]
  ) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        preferences: {
          ...prev.settings.preferences,
          [key]: value,
        },
      },
    }));
  };

  const value: AppStateContextValue = {
    ready,
    data,
    activeProfile,
    activeSessions,
    completedSessions,
    global,
    baseline,
    tier,
    createProfile,
    setActiveProfile,
    startSession,
    endSession,
    startRack,
    endRack,
    logMiss,
    undoLastMiss,
    updateTierSetting,
    updateTierBounds,
    updatePreference,
    renameProfile,
    deleteProfile,
    deleteSession,
    toggleSessionPause,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
