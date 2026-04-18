from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.services import mobile_pairing


def _start_session(client) -> tuple[str, str]:
    r = client.post("/api/programs", json={"name": "Mobile P", "durationDays": 30})
    assert r.status_code == 200
    pid = r.json()["program"]["id"]
    r2 = client.post(
        f"/api/programs/{pid}/plans",
        json={"name": "Mobile Plan", "focusType": "mixed"},
    )
    assert r2.status_code == 200
    plan_id = r2.json()["plan"]["id"]
    r3 = client.post(
        "/api/sessions",
        json={"planId": plan_id, "tableType": "nine_ft", "mode": "rack"},
    )
    assert r3.status_code == 200
    session = r3.json()["session"]
    return session["id"], session["racks"][0]["id"]


def test_mobile_pair_token_rotation() -> None:
    mobile_pairing._TOKENS.clear()
    mobile_pairing._SESSION_INDEX.clear()
    first = mobile_pairing.issue_pair_token("session-a", "profile-a")
    second = mobile_pairing.issue_pair_token("session-a", "profile-a")
    assert second.token != first.token
    assert not mobile_pairing.validate_pair_token(first.token, session_id="session-a")
    assert mobile_pairing.validate_pair_token(second.token, session_id="session-a")


def test_mobile_pair_token_expiry(monkeypatch) -> None:
    mobile_pairing._TOKENS.clear()
    mobile_pairing._SESSION_INDEX.clear()
    t0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    monkeypatch.setattr(mobile_pairing, "_utc_now", lambda: t0)
    rec = mobile_pairing.issue_pair_token("session-exp", "profile-exp")
    monkeypatch.setattr(mobile_pairing, "_utc_now", lambda: t0 + timedelta(days=2))
    assert not mobile_pairing.validate_pair_token(rec.token, session_id="session-exp")


def test_mobile_pair_default_ttl_is_four_hours(monkeypatch) -> None:
    mobile_pairing._TOKENS.clear()
    mobile_pairing._SESSION_INDEX.clear()
    monkeypatch.delenv("ELITE_TRAINING_PAIR_TOKEN_TTL_SECONDS", raising=False)
    t0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    monkeypatch.setattr(mobile_pairing, "_utc_now", lambda: t0)
    rec = mobile_pairing.issue_pair_token("session-ttl", "profile-ttl")
    assert rec.expires_at - t0 == timedelta(hours=4)


def test_mobile_live_and_miss_requires_token(client) -> None:
    sid, rack_id = _start_session(client)

    connect = client.post(f"/api/sessions/{sid}/mobile/connect")
    assert connect.status_code == 200
    token = connect.json()["token"]

    no_auth = client.get(f"/api/sessions/{sid}/mobile/live")
    assert no_auth.status_code == 401

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Elite-Mobile-Client": "android-v1",
    }
    ok_live = client.get(f"/api/sessions/{sid}/mobile/live", headers=headers)
    assert ok_live.status_code == 200
    assert ok_live.json()["currentRackId"] == rack_id
    assert ok_live.json()["isPaused"] is False

    miss = client.post(
        f"/api/sessions/{sid}/racks/{rack_id}/misses",
        json={
            "ballNumber": 3,
            "types": ["position"],
            "outcome": "playable",
        },
        headers=headers,
    )
    assert miss.status_code == 200
    assert miss.json()["session"]["totalMisses"] == 1

    undo = client.post(
        f"/api/sessions/{sid}/undo-miss",
        headers=headers,
    )
    assert undo.status_code == 200
    assert undo.json()["session"]["totalMisses"] == 0
    assert undo.json()["undone"]["ballNumber"] == 3

    paused = client.post(
        f"/api/sessions/{sid}/pause",
        json={"pause": True},
        headers=headers,
    )
    assert paused.status_code == 200
    assert paused.json()["session"]["isPaused"] is True

    ended = client.post(
        f"/api/sessions/{sid}/racks/{rack_id}/end",
        json={},
        headers=headers,
    )
    assert ended.status_code == 200
    assert ended.json()["session"]["currentRackId"] is None

    started = client.post(
        f"/api/sessions/{sid}/racks",
        headers=headers,
    )
    assert started.status_code == 200
    assert started.json()["session"]["currentRackId"]
