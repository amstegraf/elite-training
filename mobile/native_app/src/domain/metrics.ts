import { PrecisionSession, RackRecord } from "./types";

export interface SessionDerived {
  totalRacks: number;
  totalBallsCleared: number;
  racksCompleted: number;
  potMissCount: number;
  positionRelatedMisses: number;
}

export interface GlobalMetrics {
  potRate: number | null;
  positionRate: number | null;
  rackConversionRate: number | null;
  potMade: number;
  potAttempts: number;
  positionMisses: number;
  positionCleared: number;
  racksCompleted: number;
  totalRacks: number;
}

export const isoNow = (): string => new Date().toISOString();
export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function missBreaksRun(outcome: string): boolean {
  return outcome === "pot_miss";
}

export function inferBallsCleared(rack: RackRecord): number {
  if (typeof rack.ballsCleared === "number") return rack.ballsCleared;
  const breaking = rack.misses
    .filter((m) => missBreaksRun(m.outcome))
    .map((m) => m.ballNumber);
  if (breaking.length > 0) return Math.max(0, Math.min(9, Math.min(...breaking) - 1));
  return 9;
}

export function deriveSession(session: PrecisionSession): SessionDerived {
  const endedRacks = session.racks.filter((r) => r.endedAt);
  let totalBallsCleared = 0;
  let racksCompleted = 0;
  let potMissCount = 0;
  let positionRelatedMisses = 0;

  endedRacks.forEach((r) => {
    const bc = inferBallsCleared(r);
    totalBallsCleared += bc;
    if (bc >= 9) racksCompleted += 1;
    r.misses.forEach((m) => {
      if (m.outcome === "pot_miss") potMissCount += 1;
      if (
        m.outcome === "no_shot_position" ||
        m.types.includes("position") ||
        m.types.includes("speed")
      ) {
        positionRelatedMisses += 1;
      }
    });
  });

  return {
    totalRacks: endedRacks.length,
    totalBallsCleared,
    racksCompleted,
    potMissCount,
    positionRelatedMisses,
  };
}

export function computeGlobalMetrics(sessions: PrecisionSession[]): GlobalMetrics {
  const done = sessions.filter((s) => s.status === "completed");
  let potMade = 0;
  let potAttempts = 0;
  let positionMisses = 0;
  let positionCleared = 0;
  let racksCompleted = 0;
  let totalRacks = 0;

  done.forEach((s) => {
    const d = deriveSession(s);
    potMade += d.totalBallsCleared;
    potAttempts += d.totalBallsCleared + d.potMissCount;
    positionMisses += d.positionRelatedMisses;
    positionCleared += d.totalBallsCleared;
    racksCompleted += d.racksCompleted;
    totalRacks += d.totalRacks;
  });

  const potRate = potAttempts > 0 ? potMade / potAttempts : null;
  const rawPos = positionCleared > 0 ? 1 - positionMisses / positionCleared : null;
  const positionRate = rawPos === null ? null : Math.max(0, Math.min(1, rawPos));
  const rackConversionRate = totalRacks > 0 ? racksCompleted / totalRacks : null;

  return {
    potRate,
    positionRate,
    rackConversionRate,
    potMade,
    potAttempts,
    positionMisses,
    positionCleared,
    racksCompleted,
    totalRacks,
  };
}

export function baselineComparison(
  sessions: PrecisionSession[],
  days = 30
): {
  potDiff: number | null;
  posDiff: number | null;
  convDiff: number | null;
} {
  const done = sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  if (done.length === 0) return { potDiff: null, posDiff: null, convDiff: null };

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const baseline = done.filter((s) => new Date(s.startedAt) <= cutoff);
  const baselineSessions = baseline.length > 0 ? baseline : [done[0]];

  const current = computeGlobalMetrics(done);
  const old = computeGlobalMetrics(baselineSessions);

  const diff = (a: number | null, b: number | null): number | null =>
    a === null || b === null ? null : (a - b) * 100;

  return {
    potDiff: diff(current.potRate, old.potRate),
    posDiff: diff(current.positionRate, old.positionRate),
    convDiff: diff(current.rackConversionRate, old.rackConversionRate),
  };
}

export interface SessionMetrics {
  potRate: number | null;
  positionRate: number | null;
  rackConversionRate: number | null;
  totalRacks: number;
  totalBallsCleared: number;
  totalMisses: number;
  durationSeconds: number;
}

export interface RackReportRow {
  id: string;
  rackNumber: number;
  balls: number;
  pots: number;
  misses: number;
  outcome: "win" | "loss";
  startedAt: string;
  endedAt?: string;
}

export interface CalendarMonthData {
  monthStart: Date;
  daysInMonth: number;
  offset: number;
  counts: Record<number, number>;
  totalDaysTrained: number;
  totalSessions: number;
}

export interface ProgressPoint {
  at: string;
  pot: number | null;
  pos: number | null;
  rack: number | null;
  pts: number;
}

export function sessionDurationSeconds(session: PrecisionSession): number {
  if (!session.startedAt) return 0;
  const start = new Date(session.startedAt).getTime();
  const end = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function computeSessionMetrics(session: PrecisionSession): SessionMetrics {
  const d = deriveSession(session);
  const potAttempts = d.totalBallsCleared + d.potMissCount;
  const potRate = potAttempts > 0 ? d.totalBallsCleared / potAttempts : null;
  const rawPos = d.totalBallsCleared > 0 ? 1 - d.positionRelatedMisses / d.totalBallsCleared : null;
  const positionRate = rawPos === null ? null : Math.max(0, Math.min(1, rawPos));
  const rackConversionRate = d.totalRacks > 0 ? d.racksCompleted / d.totalRacks : null;
  return {
    potRate,
    positionRate,
    rackConversionRate,
    totalRacks: d.totalRacks,
    totalBallsCleared: d.totalBallsCleared,
    totalMisses: d.potMissCount + d.positionRelatedMisses,
    durationSeconds: sessionDurationSeconds(session),
  };
}

export function buildRackReportRows(session: PrecisionSession): RackReportRow[] {
  return session.racks
    .filter((r) => r.endedAt)
    .sort((a, b) => a.rackNumber - b.rackNumber)
    .map((rack) => {
      const pots = inferBallsCleared(rack);
      return {
        id: rack.id,
        rackNumber: rack.rackNumber,
        balls: 9,
        pots,
        misses: rack.misses.length,
        outcome: pots >= 9 ? "win" : "loss",
        startedAt: rack.startedAt,
        endedAt: rack.endedAt,
      };
    });
}

export function formatDurationLabel(seconds: number): string {
  if (seconds < 3600) {
    const m = Math.max(0, Math.floor(seconds / 60));
    return `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function completedSessionsSorted(sessions: PrecisionSession[]): PrecisionSession[] {
  return sessions
    .filter((s) => s.status === "completed")
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function monthHeatmapData(
  sessions: PrecisionSession[],
  monthAnchor: Date
): CalendarMonthData {
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const monthEnd = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);
  const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
  const offset = monthStart.getDay();
  const counts: Record<number, number> = {};

  sessions.forEach((s) => {
    if (s.status !== "completed") return;
    const d = new Date(s.startedAt);
    if (d >= monthStart && d < monthEnd) {
      const day = d.getDate();
      counts[day] = (counts[day] ?? 0) + 1;
    }
  });

  const totalDaysTrained = Object.keys(counts).length;
  const totalSessions = Object.values(counts).reduce((a, b) => a + b, 0);
  return { monthStart, daysInMonth, offset, counts, totalDaysTrained, totalSessions };
}

export function currentTrainingStreak(sessions: PrecisionSession[], now = new Date()): number {
  const uniqueDays = new Set<string>();
  sessions.forEach((s) => {
    if (s.status !== "completed") return;
    uniqueDays.add(s.startedAt.slice(0, 10));
  });
  let streak = 0;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!uniqueDays.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function bucketStartIso(ts: number): string {
  return new Date(ts).toISOString();
}

export function progressionSeries(
  sessions: PrecisionSession[],
  rangeDays: number,
  pointsFor: (g: GlobalMetrics) => number
): ProgressPoint[] {
  const done = sessions
    .filter((s) => s.status === "completed")
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  if (done.length === 0) return [];

  const endTs = Date.now();
  const startTs = endTs - rangeDays * 24 * 60 * 60 * 1000;
  const filtered = done.filter((s) => new Date(s.startedAt).getTime() >= startTs);
  const source = filtered.length > 0 ? filtered : done;
  const stepCount = Math.min(12, Math.max(2, source.length));
  const spanStart = new Date(source[0].startedAt).getTime();
  const spanEnd = new Date(source[source.length - 1].startedAt).getTime();
  const span = Math.max(1, spanEnd - spanStart);

  const out: ProgressPoint[] = [];
  for (let i = 0; i < stepCount; i += 1) {
    const marker = spanStart + (span * i) / (stepCount - 1);
    const upto = source.filter((s) => new Date(s.startedAt).getTime() <= marker);
    const g = computeGlobalMetrics(upto.length > 0 ? upto : [source[0]]);
    out.push({
      at: bucketStartIso(marker),
      pot: g.potRate === null ? null : g.potRate * 100,
      pos: g.positionRate === null ? null : g.positionRate * 100,
      rack: g.rackConversionRate === null ? null : g.rackConversionRate * 100,
      pts: pointsFor(g),
    });
  }
  return out;
}
