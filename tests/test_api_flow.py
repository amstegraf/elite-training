from __future__ import annotations


def test_program_session_flow(client) -> None:
    r = client.post("/api/programs", json={"name": "P1", "durationDays": 30})
    assert r.status_code == 200
    pid = r.json()["program"]["id"]

    r2 = client.post(
        f"/api/programs/{pid}/plans",
        json={"name": "Plan A", "focusType": "mixed"},
    )
    assert r2.status_code == 200
    plan_id = r2.json()["plan"]["id"]

    r3 = client.post(
        "/api/sessions",
        json={"planId": plan_id, "tableType": "nine_ft", "mode": "rack"},
    )
    assert r3.status_code == 200
    session = r3.json()["session"]
    sid = session["id"]
    assert session["racks"]
    rack_id = session["racks"][0]["id"]

    r4 = client.post(
        f"/api/sessions/{sid}/racks/{rack_id}/misses",
        json={
            "ballNumber": 4,
            "types": ["position", "alignment"],
            "outcome": "pot_miss",
        },
    )
    assert r4.status_code == 200
    assert r4.json()["session"]["totalMisses"] == 1

    r5 = client.post(f"/api/sessions/{sid}/racks/{rack_id}/end", json={})
    assert r5.status_code == 200

    r6 = client.post(f"/api/sessions/{sid}/end")
    assert r6.status_code == 200
    assert r6.json()["session"]["status"] == "completed"

    r7 = client.get(f"/api/sessions/{sid}")
    assert r7.status_code == 200
    assert r7.json()["session"]["status"] == "completed"


def test_import_session_via_api(client) -> None:
    r = client.post("/api/programs", json={"name": "ImportP", "durationDays": 30})
    assert r.status_code == 200
    pid = r.json()["program"]["id"]
    r2 = client.post(
        f"/api/programs/{pid}/plans",
        json={"name": "Import plan", "focusType": "mixed"},
    )
    assert r2.status_code == 200
    plan_id = r2.json()["plan"]["id"]
    r3 = client.post(
        "/api/sessions",
        json={"planId": plan_id, "tableType": "eight_ft", "mode": "rack"},
    )
    assert r3.status_code == 200
    body = r3.json()["session"]
    sid = body["id"]
    client.delete(f"/api/sessions/{sid}")

    imp = client.post("/api/sessions/import", json=body)
    assert imp.status_code == 200
    assert imp.json() == {"ok": True, "id": sid}

    imp2 = client.post("/api/sessions/import", json=body)
    assert imp2.status_code == 409

    imp3 = client.post("/api/sessions/import?overwrite=true", json=body)
    assert imp3.status_code == 200
    assert imp3.json()["id"] == sid


def test_edit_rack_balls_cleared_from_report_flow(client) -> None:
    r = client.post("/api/programs", json={"name": "P2", "durationDays": 30})
    pid = r.json()["program"]["id"]
    r2 = client.post(
        f"/api/programs/{pid}/plans",
        json={"name": "Plan B", "focusType": "mixed"},
    )
    plan_id = r2.json()["plan"]["id"]

    start = client.post(
        "/api/sessions",
        json={"planId": plan_id, "tableType": "nine_ft", "mode": "rack"},
    )
    assert start.status_code == 200
    session = start.json()["session"]
    sid = session["id"]
    rack_id = session["racks"][0]["id"]

    end_r = client.post(
        f"/api/sessions/{sid}/racks/{rack_id}/end",
        json={"ballsCleared": 0},
    )
    assert end_r.status_code == 200

    end_s = client.post(f"/api/sessions/{sid}/end")
    assert end_s.status_code == 200
    assert end_s.json()["session"]["status"] == "completed"

    edit = client.patch(
        f"/api/sessions/{sid}/racks/{rack_id}",
        json={"ballsCleared": 4},
    )
    assert edit.status_code == 200
    s_after = edit.json()["session"]
    assert s_after["racks"][0]["ballsCleared"] == 4
