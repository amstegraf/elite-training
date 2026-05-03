import { TierLabel, TierSettings, TIER_LABELS } from "./types";

export const MAX_TIER_POINTS = 10000;

function scoreFromPct(pct: number, bounds: [number, number, number, number]): number {
  const [b0, b1, b2, b3] = bounds;
  const x = pct;
  if (x < b0) return b0 <= 0 ? 0 : Math.max(0, Math.min(1, x / b0));
  if (x < b1) return 1 + (x - b0) / (b1 - b0);
  if (x < b2) return 2 + (x - b1) / (b2 - b1);
  if (x < b3) return 3 + 0.5 * ((x - b2) / Math.max(1e-9, b3 - b2));
  if (x < 100) return 3.5 + 0.5 * ((x - b3) / Math.max(1e-9, 100 - b3));
  return 4;
}

function adjustedComposite(potPct: number, posPct: number, convPct: number, s: TierSettings): number {
  const ps = scoreFromPct(potPct, s.potPctLowerBounds);
  const xs = scoreFromPct(posPct, s.posPctLowerBounds);
  const cs = scoreFromPct(convPct, s.convPctLowerBounds);
  const base = xs * s.weightPos + cs * s.weightConv + ps * s.weightPot;
  const imbalance = Math.max(ps, xs, cs) - Math.min(ps, xs, cs);
  return Math.max(0, Math.min(4, base - imbalance * s.penaltyFactor));
}

export function tierPointCuts(s: TierSettings): [number, number, number, number, number] {
  const asPts = (idx: number): number => {
    const c = adjustedComposite(
      s.potPctLowerBounds[idx],
      s.posPctLowerBounds[idx],
      s.convPctLowerBounds[idx],
      s
    );
    return Math.round((c / 4) * MAX_TIER_POINTS);
  };
  const a = asPts(0);
  const b = Math.max(a + 1, asPts(1));
  const c = Math.max(b + 1, asPts(2));
  const d = Math.max(c + 1, asPts(3));
  const elite = Math.max(d + 1, Math.min(9500, Math.round(d + (MAX_TIER_POINTS - d) * 0.6)));
  return [a, b, c, d, elite];
}

function gateTier(potPct: number, posPct: number, convPct: number, s: TierSettings): number {
  const pb = s.potPctLowerBounds;
  const xb = s.posPctLowerBounds;
  const cb = s.convPctLowerBounds;
  if (potPct >= pb[3] && posPct >= xb[3] && convPct >= cb[3]) return 4;
  if (potPct >= pb[2] && posPct >= xb[2] && convPct >= cb[2]) return 3;
  if (potPct >= pb[1] && posPct >= xb[1] && convPct >= cb[1]) return 2;
  if (potPct >= pb[0] && posPct >= xb[0] && convPct >= cb[0]) return 1;
  return 0;
}

export function computeTier(
  potRate: number | null,
  posRate: number | null,
  convRate: number | null,
  settings: TierSettings
): { label: TierLabel; points: number; pointsToNext: number | null; progressPct: number } | null {
  if (potRate === null || posRate === null || convRate === null) return null;
  const potPct = potRate * 100;
  const posPct = posRate * 100;
  const convPct = convRate * 100;
  const composite = adjustedComposite(potPct, posPct, convPct, settings);
  const rawPoints = Math.round((composite / 4) * MAX_TIER_POINTS);
  const cuts = tierPointCuts(settings);
  let pointsIdx: number = cuts.length;
  for (let i = 0; i < cuts.length; i += 1) {
    if (rawPoints < cuts[i]) {
      pointsIdx = i;
      break;
    }
  }
  const gate = gateTier(potPct, posPct, convPct, settings);
  const effective = pointsIdx >= 5 && gate >= 4 ? 5 : Math.min(pointsIdx, gate);
  const lo = effective === 0 ? 0 : cuts[effective - 1];
  const hi = effective >= 5 ? MAX_TIER_POINTS : cuts[effective];
  const points = effective >= 5 ? rawPoints : Math.min(rawPoints, hi - 1);
  const span = Math.max(1, hi - lo);
  const progressPct = Math.max(0, Math.min(100, ((points - lo) / span) * 100));
  const pointsToNext = effective >= 5 ? null : Math.max(1, Math.ceil(hi - points));
  return {
    label: TIER_LABELS[effective],
    points,
    pointsToNext,
    progressPct,
  };
}
