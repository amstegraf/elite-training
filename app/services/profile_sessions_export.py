from __future__ import annotations

import io
import json
import re
import zipfile
from datetime import datetime, timezone

from app.services.profiles_repo import load_profile
from app.services.sessions_repo import list_sessions


def _slug_for_zip_filename(name: str) -> str:
    """ASCII-safe stem for zip filenames (Windows-safe)."""
    s = (name or "").strip()
    for ch in '<>:"/\\|?*':
        s = s.replace(ch, "_")
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"[^A-Za-z0-9._-]+", "-", s).strip("._-")
    return s[:100] or "sessions"


def default_export_zip_filename(profile_name: str) -> str:
    """e.g. ``Aurelian-Apostol_2026-04-11.zip`` (UTC date)."""
    day = datetime.now(timezone.utc).date().isoformat()
    return f"{_slug_for_zip_filename(profile_name)}_{day}.zip"


def build_profile_sessions_zip(profile_id: str) -> tuple[bytes, str] | None:
    """
    Zip all sessions whose ``profileId`` matches ``profile_id``.

    Returns ``(zip_bytes, filename)`` or ``None`` if the profile does not exist.
    """
    prof = load_profile(profile_id)
    if not prof:
        return None

    sessions = list_sessions(profile_id=profile_id, limit=50_000)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for s in sessions:
            payload = json.dumps(s.model_dump(by_alias=True), indent=2) + "\n"
            zf.writestr(f"{s.id}.json", payload.encode("utf-8"))
    name = default_export_zip_filename(prof.name)
    return buf.getvalue(), name
