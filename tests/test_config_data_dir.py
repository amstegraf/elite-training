from __future__ import annotations

import importlib
import os
from pathlib import Path


def test_elite_training_data_dir_env(tmp_path, monkeypatch) -> None:
    d = tmp_path / "custom-data"
    monkeypatch.setenv("ELITE_TRAINING_DATA_DIR", str(d))
    import app.config as cfg

    importlib.reload(cfg)
    try:
        assert cfg.DATA_DIR == d.resolve()
        assert cfg.SESSIONS_DIR == d.resolve() / "sessions"
        assert cfg.PROFILES_DIR == d.resolve() / "profiles"
        assert cfg.PROGRAMS_FILE == d.resolve() / "programs.json"
        assert d.resolve().exists()
        assert (d.resolve() / "sessions").exists()
        assert (d.resolve() / "profiles").exists()
    finally:
        monkeypatch.delenv("ELITE_TRAINING_DATA_DIR", raising=False)
        importlib.reload(cfg)
