from __future__ import annotations

import json
from uuid import uuid4

from fastapi.testclient import TestClient

from app.factory import create_app
from app.models import PrecisionSession, PrecisionSessionStatus, SessionMode, TableType
from app.services import profiles_repo
from app.services.sessions_repo import load_session, save_session


def test_initials_from_name() -> None:
    assert profiles_repo.initials_from_name("Aurelian Apostol") == "AA"
    assert profiles_repo.initials_from_name("Madonna") == "MA"
    assert profiles_repo.initials_from_name("A") == "A"


def test_list_sessions_filters_by_profile(tmp_path, monkeypatch) -> None:
    data = tmp_path / "data"
    data.mkdir()
    sessions_dir = data / "sessions"
    sessions_dir.mkdir()
    profiles_dir = data / "profiles"
    profiles_dir.mkdir(parents=True)
    monkeypatch.setattr("app.config.DATA_DIR", data)
    monkeypatch.setattr("app.config.SESSIONS_DIR", sessions_dir)
    monkeypatch.setattr("app.config.PROFILES_DIR", profiles_dir)
    monkeypatch.setattr("app.config.PROGRAMS_FILE", data / "programs.json")
    monkeypatch.setattr("app.services.programs_repo.ensure_dev_seed", lambda: None)

    from app.services.sessions_repo import list_sessions

    pa = profiles_repo.create_profile("A")
    pb = profiles_repo.create_profile("B")

    def minimal_session(sid: str, profile_id: str) -> PrecisionSession:
        return PrecisionSession(
            id=sid,
            program_id="p",
            plan_id="pl",
            table_type=TableType.EIGHT_FT,
            mode=SessionMode.RACK,
            status=PrecisionSessionStatus.COMPLETED,
            profile_id=profile_id,
        )

    s1 = str(uuid4())
    s2 = str(uuid4())
    save_session(minimal_session(s1, pa.id))
    save_session(minimal_session(s2, pb.id))

    la = list_sessions(limit=50, profile_id=pa.id)
    assert [x.id for x in la] == [s1]
    lb = list_sessions(limit=50, profile_id=pb.id)
    assert [x.id for x in lb] == [s2]


def test_first_profile_associates_existing_sessions(tmp_path, monkeypatch) -> None:
    data = tmp_path / "data"
    data.mkdir()
    sessions_dir = data / "sessions"
    sessions_dir.mkdir()
    profiles_dir = data / "profiles"
    profiles_dir.mkdir(parents=True)
    monkeypatch.setattr("app.config.DATA_DIR", data)
    monkeypatch.setattr("app.config.SESSIONS_DIR", sessions_dir)
    monkeypatch.setattr("app.config.PROFILES_DIR", profiles_dir)
    monkeypatch.setattr("app.config.PROGRAMS_FILE", data / "programs.json")
    monkeypatch.setattr("app.services.programs_repo.ensure_dev_seed", lambda: None)

    sid = str(uuid4())
    raw = {
        "schemaVersion": 1,
        "id": sid,
        "programId": "p",
        "planId": "pl",
        "status": "completed",
        "tableType": "eight_ft",
        "mode": "rack",
    }
    (sessions_dir / f"{sid}.json").write_text(json.dumps(raw), encoding="utf-8")

    with TestClient(create_app()) as c:
        r = c.post("/profiles/first", json={"name": "Solo"})
        assert r.status_code == 200
        r2 = c.post("/profiles/first", json={"name": "Again"})
        assert r2.status_code == 400

    s = load_session(sid)
    assert s is not None
    assert s.profile_id is not None
    prof = profiles_repo.load_profile(s.profile_id)
    assert prof is not None
    assert sid in prof.session_ids


def test_import_requires_profile(tmp_path, monkeypatch) -> None:
    data = tmp_path / "data"
    data.mkdir()
    (data / "sessions").mkdir()
    (data / "profiles").mkdir(parents=True)
    monkeypatch.setattr("app.config.DATA_DIR", data)
    monkeypatch.setattr("app.config.SESSIONS_DIR", data / "sessions")
    monkeypatch.setattr("app.config.PROFILES_DIR", data / "profiles")
    monkeypatch.setattr("app.config.PROGRAMS_FILE", data / "programs.json")
    monkeypatch.setattr("app.services.programs_repo.ensure_dev_seed", lambda: None)

    plan_id = str(uuid4())
    body = {
        "schemaVersion": 1,
        "id": str(uuid4()),
        "programId": "p",
        "planId": plan_id,
        "status": "completed",
        "tableType": "eight_ft",
        "mode": "rack",
    }
    with TestClient(create_app()) as c:
        imp = c.post("/api/sessions/import", json=body)
        assert imp.status_code == 400


def test_delete_profile_orphans_sessions_on_disk(tmp_path, monkeypatch) -> None:
    data = tmp_path / "data"
    data.mkdir()
    sessions_dir = data / "sessions"
    sessions_dir.mkdir()
    profiles_dir = data / "profiles"
    profiles_dir.mkdir(parents=True)
    monkeypatch.setattr("app.config.DATA_DIR", data)
    monkeypatch.setattr("app.config.SESSIONS_DIR", sessions_dir)
    monkeypatch.setattr("app.config.PROFILES_DIR", profiles_dir)
    monkeypatch.setattr("app.config.PROGRAMS_FILE", data / "programs.json")
    monkeypatch.setattr("app.services.programs_repo.ensure_dev_seed", lambda: None)

    prof = profiles_repo.create_profile("Gone")
    sid = str(uuid4())
    s = PrecisionSession(
        id=sid,
        program_id="p",
        plan_id="pl",
        table_type=TableType.EIGHT_FT,
        mode=SessionMode.RACK,
        status=PrecisionSessionStatus.COMPLETED,
        profile_id=prof.id,
    )
    save_session(s)
    profiles_repo.append_session(prof.id, sid)

    assert profiles_repo.delete_profile_orphan_sessions(prof.id) is True
    assert profiles_repo.load_profile(prof.id) is None
    assert (sessions_dir / f"{sid}.json").exists()
    reloaded = load_session(sid)
    assert reloaded is not None
    assert reloaded.profile_id is None


def test_add_profile_switches_active_session_owner(client) -> None:
    """POST /profiles sets cookie to the new profile so the next session uses it."""
    r_prog = client.post("/api/programs", json={"name": "PAdd", "durationDays": 30})
    assert r_prog.status_code == 200
    prog_id = r_prog.json()["program"]["id"]
    r_plan = client.post(
        f"/api/programs/{prog_id}/plans",
        json={"name": "PlanAdd", "focusType": "mixed"},
    )
    assert r_plan.status_code == 200
    plan_id = r_plan.json()["plan"]["id"]

    r_add = client.post("/profiles", json={"name": "NewActive"})
    assert r_add.status_code == 200
    new_profile_id = r_add.json()["id"]
    assert r_add.json().get("ok") is True

    r_sess = client.post(
        "/api/sessions",
        json={"planId": plan_id, "tableType": "eight_ft", "mode": "rack"},
    )
    assert r_sess.status_code == 200
    sid = r_sess.json()["session"]["id"]
    s = load_session(sid)
    assert s is not None
    assert s.profile_id == new_profile_id
