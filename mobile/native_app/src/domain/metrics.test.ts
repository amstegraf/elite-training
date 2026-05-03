import { describe, expect, it } from "vitest";
import { baselineComparison, computeGlobalMetrics, deriveSession } from "./metrics";
import { PrecisionSession } from "./types";

function mkSession(id: string, startedAt: string, ballsCleared: number, potMiss = 0): PrecisionSession {
  return {
    id,
    profileId: "p1",
    startedAt,
    status: "completed",
    racks: [
      {
        id: `r-${id}`,
        rackNumber: 1,
        startedAt,
        endedAt: startedAt,
        ballsCleared,
        misses: Array.from({ length: potMiss }, (_, i) => ({
          id: `m-${id}-${i}`,
          ballNumber: i + 1,
          types: ["alignment"],
          outcome: "pot_miss",
          createdAt: startedAt,
        })),
      },
    ],
  };
}

describe("metrics parity", () => {
  it("derives session aggregates", () => {
    const s = mkSession("a", "2026-01-01T00:00:00.000Z", 8, 2);
    const d = deriveSession(s);
    expect(d.totalBallsCleared).toBe(8);
    expect(d.potMissCount).toBe(2);
    expect(d.totalRacks).toBe(1);
  });

  it("computes weighted global rates", () => {
    const m = computeGlobalMetrics([
      mkSession("a", "2026-01-01T00:00:00.000Z", 9, 1),
      mkSession("b", "2026-01-02T00:00:00.000Z", 8, 2),
    ]);
    expect(m.potAttempts).toBe(20);
    expect(m.potMade).toBe(17);
    expect(m.potRate).toBeCloseTo(0.85, 5);
  });

  it("compares against 30-day or oldest baseline", () => {
    const out = baselineComparison([
      mkSession("old", "2026-01-01T00:00:00.000Z", 9, 0),
      mkSession("new", new Date().toISOString(), 6, 3),
    ]);
    expect(out.potDiff).not.toBeNull();
  });
});
