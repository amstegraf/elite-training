from __future__ import annotations

import os
import secrets
import socket
from base64 import b64encode
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from io import BytesIO
from threading import Lock
from urllib.parse import urlencode

from fastapi import Request
try:
    import qrcode
except ModuleNotFoundError:  # pragma: no cover - environment-dependent fallback
    qrcode = None

DEFAULT_PAIR_TOKEN_TTL_SECONDS = 15 * 60


@dataclass(slots=True)
class PairTokenRecord:
    token: str
    session_id: str
    profile_id: str | None
    expires_at: datetime


_STORE_LOCK = Lock()
_TOKENS: dict[str, PairTokenRecord] = {}
_SESSION_INDEX: dict[tuple[str, str | None], str] = {}


def _pair_ttl_seconds() -> int:
    raw = os.environ.get("ELITE_TRAINING_PAIR_TOKEN_TTL_SECONDS", "").strip()
    if not raw:
        return DEFAULT_PAIR_TOKEN_TTL_SECONDS
    try:
        value = int(raw)
    except ValueError:
        return DEFAULT_PAIR_TOKEN_TTL_SECONDS
    return min(max(value, 30), 24 * 60 * 60)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _cleanup_expired(now: datetime) -> None:
    expired = [tok for tok, rec in _TOKENS.items() if rec.expires_at <= now]
    for tok in expired:
        rec = _TOKENS.pop(tok, None)
        if not rec:
            continue
        key = (rec.session_id, rec.profile_id)
        if _SESSION_INDEX.get(key) == tok:
            _SESSION_INDEX.pop(key, None)


def issue_pair_token(session_id: str, profile_id: str | None) -> PairTokenRecord:
    now = _utc_now()
    expires_at = now + timedelta(seconds=_pair_ttl_seconds())
    token = secrets.token_urlsafe(32)
    key = (session_id, profile_id)
    rec = PairTokenRecord(
        token=token,
        session_id=session_id,
        profile_id=profile_id,
        expires_at=expires_at,
    )
    with _STORE_LOCK:
        _cleanup_expired(now)
        old = _SESSION_INDEX.get(key)
        if old:
            _TOKENS.pop(old, None)
        _TOKENS[token] = rec
        _SESSION_INDEX[key] = token
    return rec


def validate_pair_token(
    token: str, *, session_id: str, profile_id: str | None = None
) -> bool:
    if not token:
        return False
    now = _utc_now()
    with _STORE_LOCK:
        _cleanup_expired(now)
        rec = _TOKENS.get(token)
        if not rec:
            return False
        if rec.session_id != session_id:
            return False
        if profile_id and rec.profile_id and profile_id != rec.profile_id:
            return False
    return True


def _lan_ipv4() -> str | None:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        addr = sock.getsockname()[0]
        if addr and not addr.startswith("127."):
            return addr
    except OSError:
        return None
    finally:
        sock.close()
    return None


def resolve_public_base_url(request: Request) -> str:
    env_url = os.environ.get("ELITE_TRAINING_PUBLIC_BASE_URL", "").strip()
    if env_url:
        return env_url.rstrip("/")
    scheme = request.url.scheme or "http"
    host = _lan_ipv4() or request.url.hostname or "127.0.0.1"
    port = request.url.port
    if not port:
        return f"{scheme}://{host}"
    if (scheme == "http" and port == 80) or (scheme == "https" and port == 443):
        return f"{scheme}://{host}"
    return f"{scheme}://{host}:{port}"


def build_connect_payload(request: Request, rec: PairTokenRecord) -> dict:
    base_url = resolve_public_base_url(request)
    query = urlencode(
        {
            "baseUrl": base_url,
            "sessionId": rec.session_id,
            "token": rec.token,
        }
    )
    connect_url = f"{base_url}/mobile/connect?{query}"
    deep_link_url = f"elite-training://connect?{query}"
    ttl_seconds = max(0, int((rec.expires_at - _utc_now()).total_seconds()))
    qr_data_url = None
    if qrcode is not None:
        qr = qrcode.QRCode(version=1, box_size=8, border=2)
        qr.add_data(deep_link_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        qr_data_url = "data:image/png;base64," + b64encode(buf.getvalue()).decode("ascii")
    return {
        "sessionId": rec.session_id,
        "serverBaseUrl": base_url,
        "connectUrl": connect_url,
        "deepLinkUrl": deep_link_url,
        "qrDataUrl": qr_data_url,
        "token": rec.token,
        "expiresAt": rec.expires_at.isoformat(),
        "expiresInSeconds": ttl_seconds,
    }
