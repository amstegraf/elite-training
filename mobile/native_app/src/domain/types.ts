export type MissType = "position" | "alignment" | "delivery" | "speed" | "scratch";
export type MissOutcome = "playable" | "pot_miss" | "no_shot_position";
export type SessionStatus = "in_progress" | "completed";
export type GameBallCount = 8 | 9 | 10;
export const GAME_BALL_COUNTS: readonly GameBallCount[] = [8, 9, 10] as const;

export interface MissEvent {
  id: string;
  ballNumber: number;
  types: MissType[];
  outcome: MissOutcome;
  createdAt: string;
}

export interface RackRecord {
  id: string;
  rackNumber: number;
  startedAt: string;
  endedAt?: string;
  ballsCleared?: number;
  misses: MissEvent[];
}

export interface PrecisionSession {
  id: string;
  profileId: string;
  ballCount?: GameBallCount;
  startedAt: string;
  endedAt?: string;
  status: SessionStatus;
  durationSeconds?: number;
  isPaused?: boolean;
  lastUnpausedAt?: string;
  totalMisses?: number;
  racks: RackRecord[];
  currentRackId?: string;
}

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

export interface TierSettings {
  potPctLowerBounds: [number, number, number, number];
  posPctLowerBounds: [number, number, number, number];
  convPctLowerBounds: [number, number, number, number];
  weightPos: number;
  weightConv: number;
  weightPot: number;
  penaltyFactor: number;
}

export interface UiPreferences {
  darkMode: boolean;
  haptics: boolean;
  sound: boolean;
  reminders: boolean;
  reminderTime: string;
  language: string;
}

export interface AppSettings {
  tier: TierSettings;
  preferences: UiPreferences;
}

export interface AppStateData {
  profiles: Profile[];
  activeProfileId?: string;
  sessions: PrecisionSession[];
  settings: AppSettings;
}

export const TIER_LABELS = [
  "Beginner",
  "Amateur",
  "Strong Amateur",
  "Advanced",
  "Semi-pro",
  "Elite",
] as const;
export type TierLabel = (typeof TIER_LABELS)[number];

export const DEFAULT_TIER_SETTINGS: TierSettings = {
  potPctLowerBounds: [65, 82, 90, 94],
  posPctLowerBounds: [30, 50, 70, 90],
  convPctLowerBounds: [0, 10, 40, 60],
  weightPos: 0.3,
  weightConv: 0.5,
  weightPot: 0.2,
  penaltyFactor: 0.3,
};

export const DEFAULT_APP_STATE: AppStateData = {
  profiles: [],
  sessions: [],
  settings: {
    tier: DEFAULT_TIER_SETTINGS,
    preferences: {
      darkMode: false,
      haptics: true,
      sound: true,
      reminders: true,
      reminderTime: "18:00",
      language: "English",
    },
  },
};
