from __future__ import annotations

import io
import zipfile

from app.services.profile_sessions_export import (
    build_profile_sessions_zip,
    default_export_zip_filename,
)


def test_default_export_zip_filename() -> None:
    name = default_export_zip_filename("Aurelian Apostol")
    assert name.endswith(".zip")
    assert name.startswith("Aurelian-Apostol_")
    assert "Aurelian Apostol" not in name


def test_build_profile_sessions_zip_empty_profile(client) -> None:
    r = client.get("/api/profiles")
    pid = r.json()["profiles"][0]["id"]
    built = build_profile_sessions_zip(pid)
    assert built is not None
    body, fname = built
    assert fname.endswith(".zip")
    zf = zipfile.ZipFile(io.BytesIO(body))
    assert zf.namelist() == []


def test_export_zip_download_via_api(client) -> None:
    r_prog = client.post("/api/programs", json={"name": "PExp", "durationDays": 30})
    pid = r_prog.json()["program"]["id"]
    r_plan = client.post(
        f"/api/programs/{pid}/plans",
        json={"name": "PlanExp", "focusType": "mixed"},
    )
    plan_id = r_plan.json()["plan"]["id"]
    r_sess = client.post(
        "/api/sessions",
        json={"planId": plan_id, "tableType": "eight_ft", "mode": "rack"},
    )
    sid = r_sess.json()["session"]["id"]

    prof_id = client.get("/api/profiles").json()["profiles"][0]["id"]
    r_zip = client.get(f"/api/profiles/{prof_id}/export-zip")
    assert r_zip.status_code == 200
    assert r_zip.headers.get("content-type") == "application/zip"
    cd = r_zip.headers.get("content-disposition", "")
    assert "attachment" in cd.lower()
    assert ".zip" in cd

    zf = zipfile.ZipFile(io.BytesIO(r_zip.content))
    names = zf.namelist()
    assert f"{sid}.json" in names
    raw = zf.read(f"{sid}.json").decode("utf-8")
    assert sid in raw
