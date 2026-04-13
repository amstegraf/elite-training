# Matrix Calculation of Tier

## 1) Inputs

Tiering uses three KPI rates (0-1 in code, shown as percentages in UI):

- Pot success (POT)
- Position outcome (POS)
- Rack conversion (CONV)

Threshold anchors, weights, and imbalance penalty factor are configured in `data/tier_settings.json`.

## 2) Continuous KPI score (0 to 4)

Each KPI is converted to a continuous score in `[0, 4]` using four ascending lower bounds:

- `b0, b1, b2, b3`
- score anchors: `1 at b0`, `2 at b1`, `3 at b2`, `4 at b3`
- values between anchors are linearly interpolated
- values at/above `b3` are clamped to `4`

Piecewise definition:

- if `pct < b0`: `score = clamp(pct / b0, 0, 1)` (or `0` when `b0 <= 0`)
- if `b0 <= pct < b1`: `score = 1 + (pct - b0) / (b1 - b0)`
- if `b1 <= pct < b2`: `score = 2 + (pct - b1) / (b2 - b1)`
- if `b2 <= pct < b3`: `score = 3 + (pct - b2) / (b3 - b2)`
- if `pct >= b3`: `score = 4`

This removes large jumps caused by old step-only scoring.

## 3) Weighted composite (base)

The composite stays in `[0, 4]`:

`composite = pos_score * weight_pos + conv_score * weight_conv + pot_score * weight_pot`

Because weights sum to `1`, small KPI changes produce small composite changes.

## 4) Imbalance penalty adjustment

To avoid inflated ratings from one KPI being much higher than the others:

- `imbalance = max(pot_score, pos_score, conv_score) - min(pot_score, pos_score, conv_score)`
- `penalty = imbalance * penalty_factor`
- `composite_adjusted = clamp(composite - penalty, 0, 4)`

Default `penalty_factor` is `0.25`.

## 5) Tier points and labels (hybrid)

- `tier_points = composite_adjusted * composite_points_scale`
- points band is selected by `composite_points_upper_bounds`
- final displayed label is gated by KPI minima for that label:
  - Amateur requires all KPI >= `b0`
  - Strong Amateur requires all KPI >= `b1`
  - Advanced requires all KPI >= `b2`
  - Semi-pro requires all KPI >= `b3`
  - Elite additionally requires Elite points band

This keeps smooth points while enforcing semantic per-tier minimum execution.

Defaults (example) with `scale=1000` give a 0-4000 points space, while preserving smooth movement.

## 6) Example (default bounds + default penalty)

Using default bounds from `TierSettings`:

- POT 94% -> `2 + (94-93)/(95-93) = 2.5`
- POS 58% -> `1 + (58-55)/(65-55) = 1.3`
- CONV 22% -> `1 + (22-20)/(35-20) = 1.1333`

With default weights `(pos=0.5, conv=0.3, pot=0.2)`:

- `composite_base = 1.3*0.5 + 1.1333*0.3 + 2.5*0.2 = 1.49`
- `imbalance = 2.5 - 1.1333 = 1.3667`
- `penalty = 1.3667 * 0.25 = 0.3417`
- `composite_adjusted = 1.49 - 0.3417 = 1.1483`
- `tier_points ~= 1148`

This keeps progression smooth while reducing over-rating when KPI balance is poor.

## 7) Why hybrid label gating matters

A player can have high points due to weighting and smooth scoring while still missing minimums for a higher semantic tier on one KPI.  
In that case:

- points are kept (continuous progression)
- label is capped to the highest tier whose minima are fully met