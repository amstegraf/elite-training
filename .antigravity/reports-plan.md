# Progress & Reporting Page Implementation Plan

This plan details the creation of a new aggregate reporting dashboard to visualize the metrics outlined in `docs/metrics-for-reporting.md`. The goal is to clearly show progression over time across all completed sessions.

## 1. Goal Description

Establish a new "Progress" page that aggregates session data to visualize the 6 key graphs defined in the specification:
1. Avg Balls Cleared (Line Chart)
2. Misses per Rack (Line Chart)
3. Miss Type Distribution (Stacked Bar)
4. Miss Ball Distribution (Histogram)
5. "No Shot Due to Position" (Line Chart)
6. Best Run / Max Balls (Line Chart)

## User Review Required

> [!IMPORTANT]
> 1. **Charting Library:** To implement line charts and histograms efficiently and beautifully, I propose importing **Chart.js** via a CDN (e.g., cdnjs). This is lightweight and will allow us to create highly polished, interactive graphs. Are you okay with adding Chart.js?
> 2. **Navigation:** I propose adding a new "Progress" icon to the left sidebar (between Dashboard and History) rather than cramming all these charts onto the History or Dashboard pages. Does having a dedicated `/progress` route sound correct?

## Proposed Changes

---

### Backend: Data Aggregation

#### [NEW] `app/routers/progress.py`
Add a new router providing the `/progress` HTML page and an `/api/progress` endpoint (or just populate Jinja context directly) that calculates time-series data from `list_sessions()`.

#### [MODIFY] `app/services/derived_metrics.py`
Extend this module to handle multi-session aggregations:
- Time-series extraction of `avg_balls_cleared`, `total_misses / total_racks`, and `best_run_balls`.
- Aggregate miss types by session date for stacked bars.
- Aggregate frequencies of miss `ball_number` for the histogram.

---

### Frontend: UI & Routing

#### [MODIFY] `main.py` (or `app/factory.py`)
Include the new `progress` router.

#### [MODIFY] `templates/base.html`
Add a new "Progress" (e.g., a trend-up chart icon) item to the `sidebar__nav`.

#### [NEW] `templates/progress/index.html`
Create the main Progress view containing a grid of 6 chart canvases, each housed in a premium `.chart-card` to match the recent dashboard redesign.

#### [NEW] `static/js/reports/progress.js`
A Javascript file responsible for initializing and styling the Chart.js instances. It will apply our specific color tokens (`var(--pr)`, `--fr`, `#ff694b`, etc.) to the charts to maintain the soft UI aesthetic.

#### [NEW] `static/css/reports/progress.css`
Styles to manage the grid layout of the charts, specifically ensuring they scale correctly and stack on mobile views.

## Verification Plan

### Automated/Manual Verification
- Generate 3-5 dummy sessions in the JSON backend with varying dates to simulate progression.
- Navigate to `/progress` and verify all 6 charts render without console errors.
- Verify that hovering over chart data points shows tooltips, and the color palette strictly matches the application's CSS variables.
- Ensure the sidebar navigation correctly highlights the active route.
