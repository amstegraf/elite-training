from __future__ import annotations

import json
import os
from pathlib import Path

import app.config as app_config

from app.models import MeshSettings
from app.services.atomic_json import write_json_atomic
from app.services.mesh_url import normalize_mesh_base_url, validate_mesh_base_url


def mesh_settings_path() -> Path:
    return app_config.DATA_DIR / "mesh_settings.json"


def load_mesh_settings() -> MeshSettings:
    path = mesh_settings_path()
    if not path.exists():
        return MeshSettings()
    try:
        return MeshSettings.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, ValueError):
        return MeshSettings()


def save_mesh_settings(settings: MeshSettings) -> None:
    write_json_atomic(mesh_settings_path(), settings.model_dump(mode="json", by_alias=True))


def resolve_mesh_base_url() -> str:
    """
    Precedence: ELITE_MESH_BASE_URL (if set) → persisted mesh_settings.json → default.
    """
    env = os.environ.get("ELITE_MESH_BASE_URL", "").strip()
    if env:
        return normalize_mesh_base_url(validate_mesh_base_url(env))
    raw = load_mesh_settings().base_url
    try:
        return normalize_mesh_base_url(validate_mesh_base_url(raw))
    except ValueError:
        return normalize_mesh_base_url("http://127.0.0.1:8090")
