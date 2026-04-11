"""
Recompute v1 session aggregates after reporting rule changes.

Reads each JSON under data/sessions/, runs recompute_session_aggregates, saves.

Usage:
  python scripts/migrate_sessions.py              # all sessions
  python scripts/migrate_sessions.py --dry-run  # print changes only
  python scripts/migrate_sessions.py --id UUID  # single session
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.models import PrecisionSession  # noqa: E402
from app.services.derived_metrics import recompute_session_aggregates  # noqa: E402
from app.services.sessions_repo import list_sessions, load_session, save_session  # noqa: E402


def _snapshot(s: PrecisionSession) -> dict:
    return {
        "bestRunBalls": s.best_run_balls,
        "trueMissCount": s.true_miss_count,
        "trainingMissCount": s.training_miss_count,
        "avgBallsBeforeTrueMiss": s.avg_balls_before_true_miss,
        "avgBallsClearedPerRack": s.avg_balls_cleared_per_rack,
        "totalMisses": s.total_misses,
    }


def migrate(*, dry_run: bool, session_id: str | None) -> int:
    if session_id:
        s = load_session(session_id)
        if not s:
            print(f"Session not found: {session_id}", file=sys.stderr)
            return 1
        sessions = [s]
    else:
        sessions = list_sessions(limit=10_000)

    ok = 0
    for sess in sessions:
        before = _snapshot(sess)
        recompute_session_aggregates(sess)
        after = _snapshot(sess)
        changed = before != after
        if changed or session_id:
            print(f"{sess.id}: {json.dumps(before)} -> {json.dumps(after)}")
        if not dry_run:
            save_session(sess)
        ok += 1
    print(f"Processed {ok} session(s)" + (" (dry-run, not saved)" if dry_run else ""))
    return 0


def main() -> None:
    p = argparse.ArgumentParser(description="Recompute session reporting KPIs")
    p.add_argument("--dry-run", action="store_true", help="Print diffs only, do not write files")
    p.add_argument("--id", dest="session_id", default=None, help="Single session UUID")
    args = p.parse_args()
    raise SystemExit(migrate(dry_run=args.dry_run, session_id=args.session_id))


if __name__ == "__main__":
    main()
