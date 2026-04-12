from __future__ import annotations

from fastapi import Request, Response

from app.models import PlayerProfile
from app.services.profiles_repo import initials_from_name, list_profiles

PROFILE_COOKIE_NAME = "elite_training_profile_id"
PROFILE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60


def _pick_default_profile_id(profiles: list[PlayerProfile]) -> str:
    return sorted(profiles, key=lambda p: p.id)[0].id


def attach_profile_context(request: Request) -> str | None:
    """
    Populate ``request.state`` for templates and API.

    Returns a cookie **value** to set on the outgoing response when the browser
    had no valid cookie (first visit after profiles exist).
    """
    profiles = list_profiles()
    st = request.state
    st.needs_first_profile = len(profiles) == 0
    st.profiles_nav = [
        {
            "id": p.id,
            "name": p.name,
            "initials": initials_from_name(p.name),
        }
        for p in profiles
    ]

    if st.needs_first_profile:
        st.active_profile_id = None
        st.active_profile_name = None
        st.active_profile_initials = None
        return None

    cookie = request.cookies.get(PROFILE_COOKIE_NAME)
    valid = bool(cookie) and any(p.id == cookie for p in profiles)
    if valid:
        pid: str = cookie  # type: ignore[assignment]
        cookie_to_set = None
    else:
        pid = _pick_default_profile_id(profiles)
        cookie_to_set = pid

    prof = next((p for p in profiles if p.id == pid), None)
    st.active_profile_id = pid
    st.active_profile_name = prof.name if prof else ""
    st.active_profile_initials = initials_from_name(prof.name) if prof else "?"
    return cookie_to_set


def set_profile_cookie(response: Response, profile_id: str) -> None:
    response.set_cookie(
        key=PROFILE_COOKIE_NAME,
        value=profile_id,
        max_age=PROFILE_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )


def clear_profile_cookie(response: Response) -> None:
    response.delete_cookie(PROFILE_COOKIE_NAME, path="/")
