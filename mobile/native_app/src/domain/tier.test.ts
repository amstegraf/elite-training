import { describe, expect, it } from "vitest";
import { computeTier, tierPointCuts } from "./tier";
import { DEFAULT_TIER_SETTINGS } from "./types";

describe("tier engine parity", () => {
  it("derives strictly increasing cuts", () => {
    const cuts = tierPointCuts(DEFAULT_TIER_SETTINGS);
    expect(cuts[0]).toBeLessThan(cuts[1]);
    expect(cuts[1]).toBeLessThan(cuts[2]);
    expect(cuts[2]).toBeLessThan(cuts[3]);
    expect(cuts[3]).toBeLessThan(cuts[4]);
  });

  it("computes tier label and points", () => {
    const out = computeTier(0.939, 0.796, 0.432, DEFAULT_TIER_SETTINGS);
    expect(out).not.toBeNull();
    expect(out?.label).toBe("Advanced");
    expect(out?.points).toBeGreaterThan(7000);
  });
});
