import type { GameBallCount, MissEvent, MissOutcome, MissType, PrecisionSession, RackRecord } from "../domain/types";
import { uid } from "../domain/metrics";

const MISS_TYPE_MAP: Record<string, MissType> = {
  alignment: "alignment",
  speed: "speed",
  speed_control: "speed",
  position: "position",
  angle_judgment: "position",
  delivery: "delivery",
  side_spin: "delivery",
  stance_or_grip: "delivery",
  scratch: "scratch",
  foul: "scratch",
};

const MISS_OUTCOME_MAP: Record<string, MissOutcome> = {
  playable: "playable",
  pot_miss: "pot_miss",
  position_miss: "no_shot_position",
  no_shot_position: "no_shot_position",
  safety: "no_shot_position",
  foul: "no_shot_position",
  both: "no_shot_position",
  other: "no_shot_position",
};

type GenericRecord = Record<string, unknown>;

const asRecord = (value: unknown): GenericRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as GenericRecord)
    : null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const normalizeTypes = (value: unknown): MissEvent["types"] => {
  if (!Array.isArray(value)) return [];
  const types = value
    .map((item) => (typeof item === "string" ? MISS_TYPE_MAP[item] : undefined))
    .filter((item): item is MissType => Boolean(item));
  return Array.from(new Set(types));
};

const normalizeOutcome = (value: unknown): MissEvent["outcome"] => {
  if (typeof value !== "string") return "no_shot_position";
  return MISS_OUTCOME_MAP[value] ?? "no_shot_position";
};

const resolveBallCount = (row: GenericRecord): GameBallCount => {
  const numeric =
    asNumber(row.ballCount) ??
    asNumber(row.ball_count) ??
    asNumber(row.totalBalls) ??
    asNumber(row.total_balls);
  const discipline = asString(row.gameType) ?? asString(row.game_type) ?? asString(row.discipline) ?? asString(row.game);
  if (numeric === 8 || discipline?.includes("8")) return 8;
  if (numeric === 10 || discipline?.includes("10")) return 10;
  return 9;
};

const normalizeMiss = (miss: unknown, fallbackCreatedAt: string, ballCount: GameBallCount): MissEvent | null => {
  const row = asRecord(miss);
  if (!row) return null;
  const ball =
    asNumber(row.ballNumber) ??
    asNumber(row.ball_number) ??
    asNumber(row.ball) ??
    asNumber(row.ball_no);
  if (ball === undefined) return null;
  return {
    id: asString(row.id) ?? uid(),
    ballNumber: clamp(Math.round(ball), 1, ballCount),
    types: normalizeTypes(row.types),
    outcome: normalizeOutcome(row.outcome),
    createdAt: asString(row.createdAt) ?? asString(row.created_at) ?? fallbackCreatedAt,
  };
};

const normalizeRack = (
  rack: unknown,
  index: number,
  sessionStart: string,
  ballCount: GameBallCount,
  sessionEnd?: string,
): RackRecord | null => {
  const row = asRecord(rack);
  if (!row) return null;
  const missesRaw = Array.isArray(row.misses) ? row.misses : [];
  const fallbackCreatedAt =
    asString(row.endedAt) ?? asString(row.ended_at) ?? sessionEnd ?? sessionStart;
  const misses = missesRaw
    .map((entry) => normalizeMiss(entry, fallbackCreatedAt, ballCount))
    .filter((entry): entry is MissEvent => Boolean(entry));
  const ballsCleared =
    asNumber(row.ballsCleared) ??
    asNumber(row.balls_cleared) ??
    asNumber(row.pottedBalls) ??
    asNumber(row.potted_balls);
  return {
    id: asString(row.id) ?? uid(),
    rackNumber:
      Math.max(
        1,
        Math.round(asNumber(row.rackNumber) ?? asNumber(row.rack_number) ?? index + 1),
      ) || index + 1,
    startedAt: asString(row.startedAt) ?? asString(row.started_at) ?? sessionStart,
    endedAt: asString(row.endedAt) ?? asString(row.ended_at),
    ballsCleared:
      ballsCleared === undefined ? undefined : clamp(Math.round(ballsCleared), 0, ballCount),
    misses,
  };
};

const normalizeSession = (
  session: unknown,
  profileId: string,
  defaultStartedAt: string,
): PrecisionSession | null => {
  const row = asRecord(session);
  if (!row) return null;
  const startedAt = asString(row.startedAt) ?? asString(row.started_at) ?? defaultStartedAt;
  const endedAt = asString(row.endedAt) ?? asString(row.ended_at);
  const ballCount = resolveBallCount(row);
  const racksRaw = Array.isArray(row.racks) ? row.racks : [];
  const racks = racksRaw
    .map((rack, idx) => normalizeRack(rack, idx, startedAt, ballCount, endedAt))
    .filter((rack): rack is RackRecord => Boolean(rack));
  if (!racks.length) return null;
  const sourceStatus = asString(row.status);
  const status: PrecisionSession["status"] =
    sourceStatus === "completed" || endedAt ? "completed" : "in_progress";
  const totalMisses = racks.reduce((sum, rack) => sum + rack.misses.length, 0);
  return {
    id: asString(row.id) ?? uid(),
    // Bind imported desktop sessions to the active mobile profile so they appear immediately.
    profileId,
    ballCount,
    startedAt,
    endedAt,
    status,
    durationSeconds: asNumber(row.durationSeconds) ?? asNumber(row.duration_seconds),
    isPaused: asBoolean(row.isPaused) ?? asBoolean(row.is_paused) ?? false,
    lastUnpausedAt: asString(row.lastUnpausedAt) ?? asString(row.last_unpaused_at),
    totalMisses: asNumber(row.totalMisses) ?? asNumber(row.total_misses) ?? totalMisses,
    racks,
    currentRackId: status === "in_progress" ? asString(row.currentRackId) : undefined,
  };
};

export const importDesktopSessions = (
  rawSessions: unknown[],
  profileId: string,
): PrecisionSession[] => {
  const now = new Date().toISOString();
  const imported = rawSessions
    .map((session) => normalizeSession(session, profileId, now))
    .filter((session): session is PrecisionSession => Boolean(session))
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  const sessionIds = new Set<string>();
  return imported.map((session) => {
    const id = sessionIds.has(session.id) ? uid() : session.id;
    sessionIds.add(id);
    return { ...session, id };
  });
};
