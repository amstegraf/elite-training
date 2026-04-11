from __future__ import annotations

from app.models import (
    MissEvent,
    MissOutcome,
    MissType,
    MissTypeCounts,
    PrecisionSession,
    RackRecord,
)


def default_balls_cleared_for_rack(rack: RackRecord) -> int:
    if not rack.misses:
        return 9
    first = min(m.ball_number for m in rack.misses)
    return max(0, first - 1)


def best_run_balls_for_rack(rack: RackRecord) -> int:
    """Longest streak of balls made without a terminating miss (ignoring PLAYABLE outcome)."""
    terminal_misses = [m for m in rack.misses if m.outcome != MissOutcome.PLAYABLE]
    if not terminal_misses:
        bc = rack.balls_cleared
        if bc is not None:
            return min(9, bc)
        return 9
    
    balls_sorted = sorted({m.ball_number for m in terminal_misses})
    prev = 0
    best = 0
    for b in balls_sorted:
        streak = b - 1 - prev
        best = max(best, streak)
        prev = b
        
    bc = rack.balls_cleared if rack.balls_cleared is not None else 9
    tail = bc - prev
    best = max(best, tail)
    return max(0, min(9, best))


def recompute_rack_balls_cleared(rack: RackRecord) -> None:
    if rack.balls_cleared is None and rack.ended_at:
        rack.balls_cleared = default_balls_cleared_for_rack(rack)


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


def recompute_session_aggregates(session: PrecisionSession) -> None:
    ended = [r for r in session.racks if r.ended_at]
    session.total_racks = len(ended)
    session.total_misses = sum(len(r.misses) for r in session.racks)
    session.miss_type_counts = MissTypeCounts()
    session.no_shot_position_count = 0
    for r in session.racks:
        for m in r.misses:
            accumulate_miss_counts(session.miss_type_counts, m)
            session.no_shot_position_count += no_shot_increment(m.outcome)

    if ended:
        cleared_vals: list[int] = []
        best = 0
        for r in ended:
            bc = r.balls_cleared
            if bc is None:
                bc = default_balls_cleared_for_rack(r)
                r.balls_cleared = bc
            cleared_vals.append(bc)
            best = max(best, best_run_balls_for_rack(r))
        session.avg_balls_cleared_per_rack = sum(cleared_vals) / len(cleared_vals)
        session.best_run_balls = best
    else:
        session.avg_balls_cleared_per_rack = None
        session.best_run_balls = 0


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
    misses_per_rack = []
    no_shot_counts = []
    best_runs = []
    
    pct_position = []
    pct_alignment = []
    pct_delivery = []
    pct_speed = []
    pct_combined = []
    
    ball_miss_hist = {str(i): 0 for i in range(1, 16)}
    
    for s in sessions_asc:
        # We only plot completed sessions with at least one rack
        if s.status.value != "completed" or not s.total_racks:
            continue
            
        labels.append(s.started_at[:10])
        avg_balls_cleared.append(round(s.avg_balls_cleared_per_rack or 0, 2))
        misses_per_rack.append(round(s.total_misses / max(1, s.total_racks), 2))
        no_shot_counts.append(s.no_shot_position_count)
        best_runs.append(s.best_run_balls)
        
        pct = miss_type_percentages(s.miss_type_counts)
        pct_position.append(pct["position"])
        pct_alignment.append(pct["alignment"])
        pct_delivery.append(pct["delivery"])
        pct_speed.append(pct["speed"])
        pct_combined.append(pct["combined"])
        
        for r in s.racks:
            for m in r.misses:
                b_str = str(m.ball_number)
                if b_str in ball_miss_hist:
                    ball_miss_hist[b_str] += 1
                    
    # Only keep up to the max ball that actually has misses (minimum 9)
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
        "misses_per_rack": misses_per_rack,
        "no_shot_counts": no_shot_counts,
        "best_runs": best_runs,
        "miss_type_position": pct_position,
        "miss_type_alignment": pct_alignment,
        "miss_type_delivery": pct_delivery,
        "miss_type_speed": pct_speed,
        "miss_type_combined": pct_combined,
        "hist_labels": hist_labels,
        "hist_data": hist_data
    }
