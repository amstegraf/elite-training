from __future__ import annotations

import json
from pathlib import Path

import app.config as app_config

from app.models import TierSettings
from app.services.atomic_json import write_json_atomic


def tier_settings_path() -> Path:
    """Resolved at call time so tests can monkeypatch ``app.config.DATA_DIR``."""
    return app_config.DATA_DIR / "tier_settings.json"


def load_tier_settings() -> TierSettings:
    path = tier_settings_path()
    if not path.exists():
        return TierSettings()
    try:
        return TierSettings.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, ValueError):
        return TierSettings()


def save_tier_settings(settings: TierSettings) -> None:
    write_json_atomic(tier_settings_path(), settings.model_dump(mode="json"))
