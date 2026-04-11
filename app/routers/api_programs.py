from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.models import FocusType, PlanRules
from app.services import programs_repo

router = APIRouter(prefix="/api/programs", tags=["programs"])


class CreateProgramBody(BaseModel):
    name: str
    duration_days: int = Field(default=90, ge=1)


class PatchProgramBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    duration_days: int | None = Field(default=None, ge=1, alias="durationDays")
    active: bool | None = None


class CreatePlanBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    focus_type: FocusType = Field(alias="focusType")
    target_diameter_cm: float | None = Field(default=None, alias="targetDiameterCm")
    sessions_per_week: int | None = Field(default=None, ge=1, alias="sessionsPerWeek")
    duration_weeks: int | None = Field(default=None, ge=1, alias="durationWeeks")
    rules: PlanRules | None = None


@router.get("")
def list_programs() -> dict:
    root = programs_repo.load_programs_file()
    return {"programs": [p.model_dump(by_alias=True) for p in root.programs]}


@router.post("")
def create_program(body: CreateProgramBody) -> dict:
    root = programs_repo.load_programs_file()
    p = programs_repo.create_program(root, body.name, body.duration_days)
    return {"program": p.model_dump(by_alias=True)}


@router.patch("/{program_id}")
def patch_program(program_id: str, body: PatchProgramBody) -> dict:
    root = programs_repo.load_programs_file()
    p = programs_repo.update_program(
        root,
        program_id,
        name=body.name,
        duration_days=body.duration_days,
        make_active=body.active,
    )
    if not p:
        raise HTTPException(status_code=404, detail="Program not found")
    root = programs_repo.load_programs_file()
    p = programs_repo.get_program(root, program_id)
    return {"program": p.model_dump(by_alias=True)}


@router.post("/{program_id}/plans")
def create_plan(program_id: str, body: CreatePlanBody) -> dict:
    root = programs_repo.load_programs_file()
    plan = programs_repo.add_plan(
        root,
        program_id,
        name=body.name,
        focus_type=body.focus_type,
        target_diameter_cm=body.target_diameter_cm,
        sessions_per_week=body.sessions_per_week,
        duration_weeks=body.duration_weeks,
        rules=body.rules,
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Program not found")
    return {"plan": plan.model_dump(by_alias=True)}


@router.delete("/{program_id}")
def delete_program(program_id: str) -> dict:
    root = programs_repo.load_programs_file()
    if not programs_repo.delete_program(root, program_id):
        raise HTTPException(status_code=404, detail="Program not found")
    return {"ok": True}


@router.delete("/{program_id}/plans/{plan_id}")
def delete_plan(program_id: str, plan_id: str) -> dict:
    root = programs_repo.load_programs_file()
    if not programs_repo.delete_plan(root, program_id, plan_id):
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"ok": True}
