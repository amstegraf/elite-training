from __future__ import annotations

from app.models import PrecisionSession, PrecisionSessionStatus, SessionMode, TableType
from app.services.dashboard_reference_session import filter_sessions_since_reference


def _session(session_id: str, started_at: str) -> PrecisionSession:
    return PrecisionSession(
        id=session_id,
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        started_at=started_at,
    )


def test_filter_sessions_since_reference_inclusive() -> None:
    s_old = _session("a", "2024-01-01T10:00:00+00:00")
    s_mid = _session("b", "2024-06-01T12:00:00+00:00")
    s_new = _session("c", "2024-12-01T12:00:00+00:00")
    newest_first = [s_new, s_mid, s_old]

    filtered, rid = filter_sessions_since_reference(newest_first, "b")
    assert rid == "b"
    assert [x.id for x in filtered] == ["c", "b"]


def test_filter_sessions_unknown_id_returns_original() -> None:
    sessions = [_session("x", "2025-01-01T00:00:00+00:00")]
    filtered, rid = filter_sessions_since_reference(sessions, "missing")
    assert rid is None
    assert filtered is sessions


def test_filter_sessions_empty_reference() -> None:
    sessions = [_session("x", "2025-01-01T00:00:00+00:00")]
    filtered, rid = filter_sessions_since_reference(sessions, None)
    assert rid is None
    assert filtered is sessions
