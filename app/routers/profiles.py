from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response

from app.services.active_profile import set_profile_cookie
from app.services.profiles_repo import (
    associate_all_existing_sessions,
    create_profile,
    initials_from_name,
    list_profiles,
)

router = APIRouter(tags=["profiles"])


async def _read_name(request: Request) -> str:
    ct = request.headers.get("content-type", "")
    if "application/json" in ct.lower():
        body = await request.json()
        return str(body.get("name", "")).strip()
    form = await request.form()
    return str(form.get("name", "")).strip()


@router.get("/api/profiles")
def api_profiles_list(request: Request) -> dict:
    profiles = list_profiles()
    return {
        "profiles": [
            {
                "id": p.id,
                "name": p.name,
                "initials": initials_from_name(p.name),
            }
            for p in profiles
        ]
    }


@router.post("/profiles/first", response_model=None)
async def profiles_create_first(request: Request) -> Response:
    if list_profiles():
        raise HTTPException(
            status_code=400, detail="A profile already exists; use add profile instead."
        )
    name = await _read_name(request)
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    p = create_profile(name)
    associate_all_existing_sessions(p.id)
    ct = request.headers.get("content-type", "")
    if "application/json" in ct.lower():
        resp = JSONResponse({"ok": True, "id": p.id, "name": p.name})
        set_profile_cookie(resp, p.id)
        return resp
    resp = RedirectResponse(url="/", status_code=303)
    set_profile_cookie(resp, p.id)
    return resp


@router.post("/profiles", response_model=None)
async def profiles_add(request: Request) -> Response:
    profiles = list_profiles()
    if not profiles:
        raise HTTPException(
            status_code=400, detail="Use POST /profiles/first when no profiles exist."
        )
    name = await _read_name(request)
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    p = create_profile(name)
    ct = request.headers.get("content-type", "")
    if "application/json" in ct.lower():
        resp = JSONResponse({"ok": True, "id": p.id, "name": p.name})
        set_profile_cookie(resp, p.id)
        return resp
    ref = request.headers.get("referer") or "/"
    resp = RedirectResponse(url=ref, status_code=303)
    set_profile_cookie(resp, p.id)
    return resp


@router.post("/profiles/active")
async def profiles_set_active(
    request: Request,
) -> RedirectResponse:
    profiles = list_profiles()
    if not profiles:
        raise HTTPException(status_code=400, detail="No profiles exist")
    form = await request.form()
    pid = str(form.get("profile_id", "")).strip()
    if not pid or not any(p.id == pid for p in profiles):
        raise HTTPException(status_code=400, detail="Invalid profile_id")
    ref = request.headers.get("referer") or "/"
    resp = RedirectResponse(url=ref, status_code=303)
    set_profile_cookie(resp, pid)
    return resp
