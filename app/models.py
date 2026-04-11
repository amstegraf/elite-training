from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class MissType(str, Enum):
    POSITION = "position"
    ALIGNMENT = "alignment"
    DELIVERY = "delivery"
    SPEED = "speed"
    COMBINED = "combined"


class MissOutcome(str, Enum):
    POT_MISS = "pot_miss"
    NO_SHOT_POSITION = "no_shot_position"
    BOTH = "both"


class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TableType(str, Enum):
    EIGHT_FT = "eight_ft"
    NINE_FT = "nine_ft"


class SessionMode(str, Enum):
    RACK = "rack"
    POSITION = "position"
    POTTING = "potting"
    PRESSURE = "pressure"


class FocusType(str, Enum):
    POSITION = "position"
    ALIGNMENT = "alignment"
    MIXED = "mixed"


class PrecisionSessionStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class PlanRules(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    reset_after_consecutive_misses: int = Field(
        default=3, ge=0, alias="resetAfterConsecutiveMisses"
    )
    warn_at_consecutive_misses: int = Field(
        default=2, ge=0, alias="warnAtConsecutiveMisses"
    )
    enabled: bool = Field(default=True, alias="enabled")


class TrainingPlan(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    id: str = Field(default_factory=lambda: str(uuid4()), alias="id")
    program_id: str = Field(alias="programId")
    name: str
    focus_type: FocusType = Field(alias="focusType")
    target_diameter_cm: Optional[float] = Field(default=None, alias="targetDiameterCm")
    sessions_per_week: Optional[int] = Field(default=None, ge=1, alias="sessionsPerWeek")
    duration_weeks: Optional[int] = Field(default=None, ge=1, alias="durationWeeks")
    rules: PlanRules = Field(default_factory=PlanRules)


class TrainingProgram(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    id: str = Field(default_factory=lambda: str(uuid4()), alias="id")
    name: str
    duration_days: int = Field(default=90, ge=1, alias="durationDays")
    active: bool = False
    plans: list[TrainingPlan] = Field(default_factory=list)


class ProgramsFile(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    schema_version: int = Field(default=1, alias="schemaVersion")
    programs: list[TrainingProgram] = Field(default_factory=list)


class SessionRuleOverrides(BaseModel):
    """Optional overrides when starting a session (MVP: mirror PlanRules)."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    reset_after_consecutive_misses: Optional[int] = Field(
        default=None, ge=0, alias="resetAfterConsecutiveMisses"
    )
    warn_at_consecutive_misses: Optional[int] = Field(
        default=None, ge=0, alias="warnAtConsecutiveMisses"
    )
    rules_enabled: Optional[bool] = Field(default=None, alias="rulesEnabled")


class MissEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    id: str = Field(default_factory=lambda: str(uuid4()), alias="id")
    ball_number: int = Field(ge=1, le=15, alias="ballNumber")
    types: list[MissType] = Field(default_factory=list)
    outcome: MissOutcome
    confidence: Optional[Confidence] = None
    created_at: str = Field(default_factory=utc_now_iso, alias="createdAt")


class RackRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    id: str = Field(default_factory=lambda: str(uuid4()), alias="id")
    rack_number: int = Field(ge=1, alias="rackNumber")
    started_at: str = Field(default_factory=utc_now_iso, alias="startedAt")
    ended_at: Optional[str] = Field(default=None, alias="endedAt")
    balls_cleared: Optional[int] = Field(default=None, ge=0, le=15, alias="ballsCleared")
    misses: list[MissEvent] = Field(default_factory=list)


class MissTypeCounts(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    position: int = 0
    alignment: int = 0
    delivery: int = 0
    speed: int = 0
    combined: int = 0


class PrecisionSession(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    schema_version: int = Field(default=1, alias="schemaVersion")
    id: str = Field(default_factory=lambda: str(uuid4()), alias="id")
    program_id: str = Field(alias="programId")
    plan_id: str = Field(alias="planId")
    status: PrecisionSessionStatus = Field(
        default=PrecisionSessionStatus.IN_PROGRESS, alias="status"
    )
    started_at: str = Field(default_factory=utc_now_iso, alias="startedAt")
    ended_at: Optional[str] = Field(default=None, alias="endedAt")
    table_type: TableType = Field(alias="tableType")
    mode: SessionMode = Field(default=SessionMode.RACK, alias="mode")
    rule_overrides: Optional[SessionRuleOverrides] = Field(
        default=None, alias="ruleOverrides"
    )
    total_racks: int = Field(default=0, ge=0, alias="totalRacks")
    total_misses: int = Field(default=0, ge=0, alias="totalMisses")
    avg_balls_cleared_per_rack: Optional[float] = Field(
        default=None, alias="avgBallsClearedPerRack"
    )
    best_run_balls: int = Field(default=0, ge=0, alias="bestRunBalls")
    no_shot_position_count: int = Field(default=0, ge=0, alias="noShotPositionCount")
    miss_type_counts: MissTypeCounts = Field(
        default_factory=MissTypeCounts, alias="missTypeCounts"
    )
    racks: list[RackRecord] = Field(default_factory=list)
    current_rack_id: Optional[str] = Field(default=None, alias="currentRackId")

    def current_rack(self) -> Optional[RackRecord]:
        if not self.current_rack_id:
            return None
        for r in self.racks:
            if r.id == self.current_rack_id:
                return r
        return None
