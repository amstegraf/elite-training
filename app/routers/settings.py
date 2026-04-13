from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from pydantic import ValidationError

from app.deps import get_templates
from app.models import TIER_LABELS
from app.services.about_info import about_page_context
from app.services.profiles_repo import (
    delete_profile_orphan_sessions,
    initials_from_name,
    list_profiles,
    rename_profile,
)
from app.models import MeshSettings
from app.services.mesh_url import validate_mesh_base_url
from app.services.mesh_settings_store import load_mesh_settings, save_mesh_settings
from app.services.tier_settings_form import parse_tier_settings_form
from app.services.tier_settings_store import load_tier_settings, save_tier_settings

router = APIRouter()


@router.get("/settings")
async def settings_index() -> RedirectResponse:
    return RedirectResponse(url="/settings/tiers", status_code=303)


@router.get("/settings/profiles")
async def settings_profiles_page(request: Request) -> object:
    templates = get_templates()
    profiles = list_profiles()
    rows = [
        {
            "id": p.id,
            "name": p.name,
            "initials": initials_from_name(p.name),
            "session_count": len(p.session_ids),
        }
        for p in profiles
    ]
    return templates.TemplateResponse(
        request,
        "settings/profiles.html",
        {
            "settings_nav_active": "profiles",
            "profiles_rows": rows,
        },
    )


@router.post("/settings/profiles/{profile_id}/rename")
async def settings_profiles_rename(
    request: Request,
    profile_id: str,
) -> RedirectResponse:
    raw = await request.form()
    name = str(raw.get("name", "")).strip()
    if not name:
        return RedirectResponse(
            url="/settings/profiles?err=rename_empty", status_code=303
        )
    if len(name) > 200:
        return RedirectResponse(
            url="/settings/profiles?err=rename_invalid", status_code=303
        )
    if rename_profile(profile_id, name) is None:
        return RedirectResponse(url="/settings/profiles?err=rename_notfound", status_code=303)
    return RedirectResponse(url="/settings/profiles?renamed=1", status_code=303)


@router.post("/settings/profiles/{profile_id}/delete")
async def settings_profiles_delete(profile_id: str) -> RedirectResponse:
    if not delete_profile_orphan_sessions(profile_id):
        return RedirectResponse(url="/settings/profiles?err=delete_notfound", status_code=303)
    return RedirectResponse(url="/settings/profiles?deleted=1", status_code=303)


@router.get("/settings/ai-mesh")
async def settings_ai_mesh_page(request: Request) -> object:
    templates = get_templates()
    err = (request.query_params.get("err") or "").strip()
    return templates.TemplateResponse(
        request,
        "settings/ai_mesh.html",
        {
            "settings_nav_active": "ai_mesh",
            "mesh_base_url": load_mesh_settings().base_url,
            "save_error": err or None,
        },
    )


@router.post("/settings/ai-mesh")
async def settings_ai_mesh_save(request: Request) -> RedirectResponse:
    raw = await request.form()
    url = str(raw.get("baseUrl", "")).strip()
    try:
        normalized = validate_mesh_base_url(url)
    except ValueError as e:
        return RedirectResponse(
            url=f"/settings/ai-mesh?err={quote(str(e))}",
            status_code=303,
        )
    save_mesh_settings(MeshSettings.model_validate({"baseUrl": normalized}))
    return RedirectResponse(url="/settings/ai-mesh?saved=1", status_code=303)


@router.get("/settings/about")
async def settings_about_page(request: Request) -> object:
    templates = get_templates()
    ctx = about_page_context()
    ctx["settings_nav_active"] = "about"
    return templates.TemplateResponse(
        request,
        "settings/about.html",
        ctx,
    )


def _tiers_page_context(
    *,
    tier_settings,
    save_error: str | None = None,
) -> dict:
    ts = tier_settings
    ceiling = ts.composite_points_scale * 4
    return {
        "settings_nav_active": "tiers",
        "tier_settings": ts,
        "tier_points_ceiling": ceiling,
        "save_error": save_error,
        "tier_names": list(TIER_LABELS),
    }


@router.get("/settings/tiers")
async def settings_tiers_page(request: Request) -> object:
    templates = get_templates()
    return templates.TemplateResponse(
        request,
        "settings/tiers.html",
        _tiers_page_context(tier_settings=load_tier_settings()),
    )


@router.post("/settings/tiers")
async def settings_tiers_save(request: Request) -> object:
    templates = get_templates()
    raw = await request.form()
    form = {str(k): str(v) for k, v in raw.items()}
    try:
        settings = parse_tier_settings_form(form)
    except (ValueError, ValidationError) as e:
        msg = str(e)
        if isinstance(e, ValidationError):
            msg = "; ".join(f"{err['loc']}: {err['msg']}" for err in e.errors())
        return templates.TemplateResponse(
            request,
            "settings/tiers.html",
            _tiers_page_context(
                tier_settings=load_tier_settings(),
                save_error=msg,
            ),
            status_code=422,
        )
    save_tier_settings(settings)
    return RedirectResponse(url="/settings/tiers?saved=1", status_code=303)
