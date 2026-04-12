from __future__ import annotations

import json
import re
from pathlib import Path
from uuid import uuid4

import app.config as app_config
from app.models import PlayerProfile
from app.services.atomic_json import write_json_atomic


def _profiles_dir() -> Path:
    return app_config.PROFILES_DIR


def _profile_path(profile_id: str) -> Path:
    return _profiles_dir() / f"{profile_id}.json"


def initials_from_name(name: str) -> str:
    name = (name or "").strip()
    if not name:
        return "?"
    parts = re.split(r"\s+", name)
    if len(parts) >= 2:
        a, b = parts[0][0], parts[1][0]
        return (a + b).upper()
    word = parts[0]
    if len(word) >= 2:
        return word[:2].upper()
    return word[0].upper()


def list_profiles() -> list[PlayerProfile]:
    d = _profiles_dir()
    if not d.exists():
        return []
    out: list[PlayerProfile] = []
    for p in d.glob("*.json"):
        try:
            out.append(
                PlayerProfile.model_validate(
                    json.loads(p.read_text(encoding="utf-8"))
                )
            )
        except (json.JSONDecodeError, ValueError):
            continue
    out.sort(key=lambda pr: pr.id)
    return out


def load_profile(profile_id: str) -> PlayerProfile | None:
    path = _profile_path(profile_id)
    if not path.exists():
        return None
    try:
        return PlayerProfile.model_validate(
            json.loads(path.read_text(encoding="utf-8"))
        )
    except (json.JSONDecodeError, ValueError):
        return None


def save_profile(profile: PlayerProfile) -> None:
    write_json_atomic(_profile_path(profile.id), profile.model_dump(mode="json"))


def create_profile(name: str) -> PlayerProfile:
    profile = PlayerProfile(id=str(uuid4()), name=name.strip())
    save_profile(profile)
    return profile


def append_session(profile_id: str, session_id: str) -> None:
    p = load_profile(profile_id)
    if not p:
        return
    if session_id in p.session_ids:
        return
    p.session_ids.append(session_id)
    save_profile(p)


def remove_session(profile_id: str, session_id: str) -> None:
    p = load_profile(profile_id)
    if not p:
        return
    p.session_ids = [x for x in p.session_ids if x != session_id]
    save_profile(p)


def rename_profile(profile_id: str, name: str) -> PlayerProfile | None:
    p = load_profile(profile_id)
    if not p:
        return None
    n = name.strip()
    if not n:
        return None
    p.name = n
    save_profile(p)
    return p


def delete_profile_orphan_sessions(profile_id: str) -> bool:
    """
    Remove the profile file and clear ``profileId`` on all sessions that pointed
    at it. Session JSON files remain on disk (orphans until linked again).
    """
    from app.services.sessions_repo import load_session, save_session, sessions_dir

    p = load_profile(profile_id)
    if not p:
        return False

    ids_to_clear: set[str] = set(p.session_ids)
    d = sessions_dir()
    if d.exists():
        for path in d.glob("*.json"):
            sid = path.stem
            s = load_session(sid)
            if s and s.profile_id == profile_id:
                ids_to_clear.add(sid)

    for sid in ids_to_clear:
        s = load_session(sid)
        if s and s.profile_id == profile_id:
            s.profile_id = None
            save_session(s)

    path = _profile_path(profile_id)
    if path.exists():
        path.unlink()
    return True


def associate_all_existing_sessions(profile_id: str) -> int:
    """Set ``profileId`` on every session file and rebuild this profile's ``sessionIds``."""
    from app.services.sessions_repo import load_session, save_session, sessions_dir

    d = sessions_dir()
    ids: list[str] = []
    if d.exists():
        for path in sorted(d.glob("*.json")):
            sid = path.stem
            s = load_session(sid)
            if not s:
                continue
            s.profile_id = profile_id
            save_session(s)
            ids.append(sid)

    prof = load_profile(profile_id)
    if not prof:
        return 0
    merged = list(dict.fromkeys(prof.session_ids + ids))
    prof.session_ids = merged
    save_profile(prof)
    return len(ids)
