from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    data = tmp_path / "data"
    data.mkdir()
    sessions = data / "sessions"
    sessions.mkdir()
    profiles = data / "profiles"
    profiles.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr("app.config.DATA_DIR", data)
    monkeypatch.setattr("app.config.PROGRAMS_FILE", data / "programs.json")
    monkeypatch.setattr("app.config.SESSIONS_DIR", sessions)
    monkeypatch.setattr("app.config.PROFILES_DIR", profiles)
    monkeypatch.setattr("app.services.programs_repo.ensure_dev_seed", lambda: None)

    from app.factory import create_app

    with TestClient(create_app()) as c:
        r = c.post("/profiles/first", json={"name": "Tester"})
        assert r.status_code == 200, r.text
        yield c
