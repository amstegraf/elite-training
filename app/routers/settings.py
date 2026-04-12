from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from pydantic import ValidationError

from app.deps import get_templates
from app.services.about_info import about_page_context
from app.services.tier_settings_form import parse_tier_settings_form
from app.services.tier_settings_store import load_tier_settings, save_tier_settings
from app.services.training_tier import (
    composite_tier_bands_for_display,
    kpi_score_bands_for_display,
)

router = APIRouter()


@router.get("/settings")
async def settings_index() -> RedirectResponse:
    return RedirectResponse(url="/settings/tiers", status_code=303)


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
    return {
        "settings_nav_active": "tiers",
        "tier_settings": ts,
        "kpi_band_rows": (
            kpi_score_bands_for_display("Potting (POT)", ts.pot_pct_lower_bounds)
            + kpi_score_bands_for_display("Position (POS)", ts.pos_pct_lower_bounds)
            + kpi_score_bands_for_display("Rack conversion (CONV)", ts.conv_pct_lower_bounds)
        ),
        "composite_bands": composite_tier_bands_for_display(ts),
        "save_error": save_error,
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
