from __future__ import annotations

from urllib.parse import urlparse

_DEFAULT_MESH_BASE = "http://127.0.0.1:8090"


def normalize_mesh_base_url(raw: str) -> str:
    s = raw.strip().rstrip("/")
    return s or _DEFAULT_MESH_BASE


def validate_mesh_base_url(raw: str) -> str:
    """
    Return normalized base URL or raise ValueError with a short message.
    """
    s = normalize_mesh_base_url(raw)
    u = urlparse(s)
    if u.scheme not in ("http", "https"):
        raise ValueError("URL must start with http:// or https://")
    if not u.netloc:
        raise ValueError("URL must include a host (e.g. http://127.0.0.1:8090)")
    return s
