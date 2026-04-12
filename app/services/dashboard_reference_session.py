from __future__ import annotations

from fastapi import Response

from app.models import PrecisionSession

REFERENCE_SESSION_COOKIE_NAME = "elite_training_reference_session_id"
REFERENCE_SESSION_MAX_AGE = 365 * 24 * 60 * 60


def filter_sessions_since_reference(
    sessions_newest_first: list[PrecisionSession],
    reference_session_id: str | None,
) -> tuple[list[PrecisionSession], str | None]:
    """
    Keep only sessions on or after the reference session's ``started_at`` (inclusive).

    ``sessions_newest_first`` is as returned by ``list_sessions`` (newest first).
    If ``reference_session_id`` is missing or not found in the list, returns the
    original list and ``None`` (caller should treat cookie as stale).
    """
    if not reference_session_id:
        return sessions_newest_first, None
    ref = next((s for s in sessions_newest_first if s.id == reference_session_id), None)
    if ref is None:
        return sessions_newest_first, None
    threshold = ref.started_at
    filtered = [s for s in sessions_newest_first if s.started_at >= threshold]
    return filtered, reference_session_id


def set_reference_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=REFERENCE_SESSION_COOKIE_NAME,
        value=session_id,
        max_age=REFERENCE_SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )


def clear_reference_session_cookie(response: Response) -> None:
    response.delete_cookie(REFERENCE_SESSION_COOKIE_NAME, path="/")
