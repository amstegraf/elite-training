from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

import app.config as app_config
from app.models import (
    FocusType,
    PlanRules,
    ProgramsFile,
    TrainingPlan,
    TrainingProgram,
)
from app.services.atomic_json import write_json_atomic


def _default_programs_file() -> ProgramsFile:
    return ProgramsFile(schema_version=1, programs=[])


def _programs_file() -> Path:
    return app_config.PROGRAMS_FILE


def load_programs_file() -> ProgramsFile:
    path = _programs_file()
    if not path.exists():
        root = _default_programs_file()
        save_programs_file(root)
        return root
    data = path.read_text(encoding="utf-8")
    return ProgramsFile.model_validate(json.loads(data))


def save_programs_file(root: ProgramsFile) -> None:
    write_json_atomic(_programs_file(), root.model_dump(by_alias=True))


def get_program(root: ProgramsFile, program_id: str) -> TrainingProgram | None:
    for p in root.programs:
        if p.id == program_id:
            return p
    return None


def get_plan(root: ProgramsFile, plan_id: str) -> tuple[TrainingProgram, TrainingPlan] | None:
    for p in root.programs:
        for pl in p.plans:
            if pl.id == plan_id:
                return p, pl
    return None


def set_active_program(root: ProgramsFile, program_id: str) -> TrainingProgram | None:
    found: TrainingProgram | None = None
    for p in root.programs:
        if p.id == program_id:
            found = p
            break
    if not found:
        return None
    for p in root.programs:
        p.active = p.id == program_id
    save_programs_file(root)
    return found


def active_program(root: ProgramsFile) -> TrainingProgram | None:
    for p in root.programs:
        if p.active:
            return p
    return None


def create_program(root: ProgramsFile, name: str, duration_days: int = 90) -> TrainingProgram:
    prog = TrainingProgram(
        id=str(uuid4()),
        name=name.strip(),
        duration_days=duration_days,
        active=False,
        plans=[],
    )
    root.programs.append(prog)
    save_programs_file(root)
    return prog


def update_program(
    root: ProgramsFile,
    program_id: str,
    *,
    name: str | None = None,
    duration_days: int | None = None,
    make_active: bool | None = None,
) -> TrainingProgram | None:
    p = get_program(root, program_id)
    if not p:
        return None
    if name is not None:
        p.name = name.strip()
    if duration_days is not None:
        p.duration_days = duration_days
    if make_active is True:
        set_active_program(root, program_id)
    elif make_active is False:
        p.active = False
    save_programs_file(root)
    return p


def add_plan(
    root: ProgramsFile,
    program_id: str,
    *,
    name: str,
    focus_type: FocusType,
    target_diameter_cm: float | None = None,
    sessions_per_week: int | None = None,
    duration_weeks: int | None = None,
    rules: PlanRules | None = None,
) -> TrainingPlan | None:
    p = get_program(root, program_id)
    if not p:
        return None
    plan = TrainingPlan(
        id=str(uuid4()),
        program_id=program_id,
        name=name.strip(),
        focus_type=focus_type,
        target_diameter_cm=target_diameter_cm,
        sessions_per_week=sessions_per_week,
        duration_weeks=duration_weeks,
        rules=rules or PlanRules(),
    )
    p.plans.append(plan)
    save_programs_file(root)
    return plan


def delete_program(root: ProgramsFile, program_id: str) -> bool:
    before = len(root.programs)
    root.programs = [p for p in root.programs if p.id != program_id]
    if len(root.programs) == before:
        return False
    save_programs_file(root)
    return True


def delete_plan(root: ProgramsFile, program_id: str, plan_id: str) -> bool:
    p = get_program(root, program_id)
    if not p:
        return False
    before = len(p.plans)
    p.plans = [pl for pl in p.plans if pl.id != plan_id]
    if len(p.plans) == before:
        return False
    save_programs_file(root)
    return True


def ensure_dev_seed() -> None:
    """If no programs exist, create one sample program + plan for local UX."""
    root = load_programs_file()
    if root.programs:
        return
    pid = str(uuid4())
    plan_id = str(uuid4())
    p = TrainingProgram(
        id=pid,
        name="Precision (sample)",
        duration_days=90,
        active=True,
        plans=[
            TrainingPlan(
                id=plan_id,
                program_id=pid,
                name="Phase 1 — 20 cm",
                focus_type=FocusType.MIXED,
                target_diameter_cm=20.0,
                sessions_per_week=4,
                duration_weeks=12,
                rules=PlanRules(),
            )
        ],
    )
    root.programs.append(p)
    save_programs_file(root)
