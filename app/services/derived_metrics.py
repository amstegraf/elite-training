from __future__ import annotations

from app.models import (
    MissEvent,
    MissOutcome,
    MissType,
    MissTypeCounts,
    PrecisionSession,
    RackRecord,
)


def miss_breaks_run(m: MissEvent) -> bool:
    """Whether this logged event ends the current ball run for streak / true-miss KPIs.

    Derived from outcome only (``endsRun`` on stored events is legacy and ignored).
    """
    return m.outcome in (
        MissOutcome.POT_MISS,
        MissOutcome.NO_SHOT_POSITION,
        MissOutcome.BOTH,
    )


def breaking_miss_ball_numbers(rack: RackRecord) -> list[int]:
    """Sorted unique ball numbers where a run-breaking event was logged."""
    return sorted({m.ball_number for m in rack.misses if miss_breaks_run(m)})


def default_balls_cleared_for_rack(rack: RackRecord) -> int | None:
    """
    Infer balls cleared when ending a rack without an explicit count.
    Returns None if only soft logs exist — caller must keep explicit ballsCleared.
    """
    if not rack.misses:
        return 9
    breaking = [m for m in rack.misses if miss_breaks_run(m)]
    if not breaking:
        return None
    return max(0, min(m.ball_number for m in breaking) - 1)


def best_run_balls_for_rack(rack: RackRecord) -> int:
    """
    Longest streak of balls made without a run-breaking event.
    If there are no run-breaking events, the whole rack is one run → balls cleared (capped at 9).
    """
    bc = rack.balls_cleared
    breaking_balls = breaking_miss_ball_numbers(rack)
    if not breaking_balls:
        if bc is not None:
            return min(9, bc)
        return 9 if not rack.misses else 0

    prev = 0
    best = 0
    for b in breaking_balls:
        streak = b - 1 - prev
        best = max(best, streak)
        prev = b
    if bc is None:
        bc = 9
    tail = max(0, bc - prev)
    best = max(best, tail)
    return min(9, best)


def recompute_rack_balls_cleared(rack: RackRecord) -> None:
    if rack.balls_cleared is None and rack.ended_at:
        inferred = default_balls_cleared_for_rack(rack)
        if inferred is not None:
            rack.balls_cleared = inferred


def accumulate_miss_counts(counts: MissTypeCounts, miss: MissEvent) -> None:
    for t in miss.types:
        if t == MissType.POSITION:
            counts.position += 1
        elif t == MissType.ALIGNMENT:
            counts.alignment += 1
        elif t == MissType.DELIVERY:
            counts.delivery += 1
        elif t == MissType.SPEED:
            counts.speed += 1
        elif t == MissType.COMBINED:
            counts.combined += 1


def no_shot_increment(outcome: MissOutcome) -> int:
    if outcome in (MissOutcome.NO_SHOT_POSITION, MissOutcome.BOTH):
        return 1
    return 0


def rack_recovery_counts(rack: RackRecord) -> tuple[int, int]:
    """
    Per docs/recovery-metric.md: for each *training* miss (chronological order in the rack),
    recovery = next logged miss is not a true miss, OR there is no next miss (rack ended
    without a true miss after). Failed = next miss is a true miss.
    """
    sorted_m = sorted(rack.misses, key=lambda m: (m.created_at, m.ball_number))
    recovery = 0
    failed = 0
    for i, m in enumerate(sorted_m):
        if miss_breaks_run(m):
            continue
        if i + 1 < len(sorted_m):
            if miss_breaks_run(sorted_m[i + 1]):
                failed += 1
            else:
                recovery += 1
        else:
            recovery += 1
    return recovery, failed


def _segment_lengths_before_breaking(rack: RackRecord) -> list[int]:
    """Each length = balls made before that breaking miss (9-ball order)."""
    balls = breaking_miss_ball_numbers(rack)
    if not balls:
        return []
    prev = 0
    lengths: list[int] = []
    for b in balls:
        lengths.append(max(0, b - 1 - prev))
        prev = b
    return lengths


def recompute_session_aggregates(session: PrecisionSession) -> None:
    ended = [r for r in session.racks if r.ended_at]
    session.total_misses = sum(len(r.misses) for r in session.racks)
    session.miss_type_counts = MissTypeCounts()
    session.no_shot_position_count = 0

    true_count = 0
    training_count = 0

    for r in session.racks:
        for m in r.misses:
            accumulate_miss_counts(session.miss_type_counts, m)
            session.no_shot_position_count += no_shot_increment(m.outcome)
            if miss_breaks_run(m):
                true_count += 1
            else:
                training_count += 1

    session.true_miss_count = true_count
    session.training_miss_count = training_count

    rec = 0
    fail_rec = 0
    for r in session.racks:
        a, b = rack_recovery_counts(r)
        rec += a
        fail_rec += b
    session.recovery_count = rec
    session.failed_recovery_count = fail_rec
    if training_count > 0:
        session.recovery_rate = round(rec / training_count, 4)
        session.failed_recovery_rate = round(fail_rec / training_count, 4)
    else:
        session.recovery_rate = None
        session.failed_recovery_rate = None

    if ended:
        cleared_vals: list[int] = []
        best = 0
        all_streaks_before_breaking: list[int] = []

        for r in ended:
            bc = r.balls_cleared
            if bc is None:
                inferred = default_balls_cleared_for_rack(r)
                if inferred is not None:
                    r.balls_cleared = inferred
                    bc = inferred
            if bc is not None:
                cleared_vals.append(bc)
            best = max(best, best_run_balls_for_rack(r))
            all_streaks_before_breaking.extend(_segment_lengths_before_breaking(r))

        session.avg_balls_cleared_per_rack = (
            sum(cleared_vals) / len(cleared_vals) if cleared_vals else None
        )
        if cleared_vals:
            session.worst_rack_balls_cleared = min(cleared_vals)
            session.best_rack_balls_cleared = max(cleared_vals)
        else:
            session.worst_rack_balls_cleared = None
            session.best_rack_balls_cleared = None
        session.best_run_balls = best
        if all_streaks_before_breaking:
            session.avg_balls_before_true_miss = sum(all_streaks_before_breaking) / len(
                all_streaks_before_breaking
            )
        else:
            session.avg_balls_before_true_miss = None

        total_bc = sum((r.balls_cleared or 0) for r in ended)
        session.total_balls_cleared = total_bc
        denom = total_bc + session.training_miss_count
        if denom > 0:
            session.conversion_efficiency = round(total_bc / denom, 4)
        else:
            session.conversion_efficiency = None
    else:
        session.avg_balls_cleared_per_rack = None
        session.best_run_balls = 0
        session.avg_balls_before_true_miss = None
        session.total_balls_cleared = 0
        session.conversion_efficiency = None
        session.worst_rack_balls_cleared = None
        session.best_rack_balls_cleared = None

    session.total_racks = len(ended)
    tr = session.total_racks
    if tr > 0:
        session.true_miss_rate = round(session.true_miss_count / tr, 4)
    else:
        session.true_miss_rate = None


def breaking_miss_type_counts(session: PrecisionSession) -> MissTypeCounts:
    """Tag counts for run-breaking events only (true misses / streak breaks)."""
    c = MissTypeCounts()
    for r in session.racks:
        for m in r.misses:
            if miss_breaks_run(m):
                accumulate_miss_counts(c, m)
    return c


def miss_type_percentages(counts: MissTypeCounts) -> dict[str, float]:
    total = counts.position + counts.alignment + counts.delivery + counts.speed + counts.combined
    if total == 0:
        return {
            "position": 0.0,
            "alignment": 0.0,
            "delivery": 0.0,
            "speed": 0.0,
            "combined": 0.0,
        }
    return {
        "position": round(100.0 * counts.position / total, 1),
        "alignment": round(100.0 * counts.alignment / total, 1),
        "delivery": round(100.0 * counts.delivery / total, 1),
        "speed": round(100.0 * counts.speed / total, 1),
        "combined": round(100.0 * counts.combined / total, 1),
    }


def suggested_next_ball_number(rack: RackRecord | None) -> int:
    if not rack or not rack.misses:
        return 1
    last = rack.misses[-1].ball_number
    return min(9, max(1, last + 1))


def aggregate_sessions_progress(sessions: list[PrecisionSession]) -> dict[str, list]:
    sessions_asc = sorted(sessions, key=lambda s: s.started_at)

    labels = []
    avg_balls_cleared = []
    true_misses_per_rack = []
    training_logs_per_rack = []
    no_shot_counts = []
    best_runs = []

    pct_position = []
    pct_alignment = []
    pct_delivery = []
    pct_speed = []
    pct_combined = []

    ball_miss_hist = {str(i): 0 for i in range(1, 16)}
    conversion_eff: list[float | None] = []
    true_miss_rates: list[float | None] = []
    worst_rack_balls: list[int | None] = []
    best_rack_balls: list[int | None] = []
    avg_rack_balls: list[float] = []
    recovery_pct: list[float | None] = []
    failed_recovery_pct: list[float | None] = []

    for s in sessions_asc:
        if s.status.value != "completed":
            continue
        # Refresh aggregates from rack/miss JSON so progress is correct even before migrate.
        recompute_session_aggregates(s)
        if s.total_racks == 0:
            continue

        labels.append(s.started_at[:10])
        avg_balls_cleared.append(round(s.avg_balls_cleared_per_rack or 0, 2))
        tr = s.true_miss_count
        true_misses_per_rack.append(round(tr / max(1, s.total_racks), 2))
        training_logs_per_rack.append(
            round(s.training_miss_count / max(1, s.total_racks), 2)
        )
        no_shot_counts.append(s.no_shot_position_count)
        best_runs.append(s.best_run_balls)
        conversion_eff.append(s.conversion_efficiency)
        true_miss_rates.append(
            round(s.true_miss_rate, 3) if s.true_miss_rate is not None else None
        )
        worst_rack_balls.append(s.worst_rack_balls_cleared)
        best_rack_balls.append(s.best_rack_balls_cleared)
        avg_rack_balls.append(round(s.avg_balls_cleared_per_rack or 0, 2))
        recovery_pct.append(
            round(s.recovery_rate * 100, 1) if s.recovery_rate is not None else None
        )
        failed_recovery_pct.append(
            round(s.failed_recovery_rate * 100, 1)
            if s.failed_recovery_rate is not None
            else None
        )

        pct = miss_type_percentages(breaking_miss_type_counts(s))
        pct_position.append(pct["position"])
        pct_alignment.append(pct["alignment"])
        pct_delivery.append(pct["delivery"])
        pct_speed.append(pct["speed"])
        pct_combined.append(pct["combined"])

        for r in s.racks:
            for m in r.misses:
                if not miss_breaks_run(m):
                    continue
                b_str = str(m.ball_number)
                if b_str in ball_miss_hist:
                    ball_miss_hist[b_str] += 1

    max_ball = 9
    for i in range(15, 9, -1):
        if ball_miss_hist[str(i)] > 0:
            max_ball = i
            break

    hist_labels = [str(i) for i in range(1, max_ball + 1)]
    hist_data = [ball_miss_hist[str(i)] for i in range(1, max_ball + 1)]

    return {
        "labels": labels,
        "avg_balls_cleared": avg_balls_cleared,
        "true_misses_per_rack": true_misses_per_rack,
        "training_logs_per_rack": training_logs_per_rack,
        "misses_per_rack": true_misses_per_rack,
        "no_shot_counts": no_shot_counts,
        "best_runs": best_runs,
        "flow_efficiency": conversion_eff,
        "conversion_efficiency": conversion_eff,
        "true_miss_rates": true_miss_rates,
        "worst_rack_balls": worst_rack_balls,
        "best_rack_balls": best_rack_balls,
        "avg_rack_balls": avg_rack_balls,
        "recovery_pct": recovery_pct,
        "failed_recovery_pct": failed_recovery_pct,
        "miss_type_position": pct_position,
        "miss_type_alignment": pct_alignment,
        "miss_type_delivery": pct_delivery,
        "miss_type_speed": pct_speed,
        "miss_type_combined": pct_combined,
        "hist_labels": hist_labels,
        "hist_data": hist_data,
    }
