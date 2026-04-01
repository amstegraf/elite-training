from fastapi import APIRouter, Request

from app.deps import get_templates
from app.services.aggregates import block_failure_counts, personal_bests, weekly_aggregates

router = APIRouter()


@router.get("/reports")
async def reports_page(request: Request) -> object:
    templates = get_templates()
    return templates.TemplateResponse(
        request,
        "reports/index.html",
        {
            "bests": personal_bests(),
            "block_fr": block_failure_counts(include_abandoned=False),
        },
    )


@router.get("/api/reports/weekly")
async def api_weekly(include_abandoned: bool = False) -> dict:
    return weekly_aggregates(include_abandoned=include_abandoned)
