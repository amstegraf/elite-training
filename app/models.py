from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class MissType(str, Enum):
    POSITION = "position"
    ALIGNMENT = "alignment"
    DELIVERY = "delivery"
    SPEED = "speed"


class MissOutcome(str, Enum):
    POT_MISS = "pot_miss"
    PLAYABLE = "playable"
    NO_SHOT_POSITION = "no_shot_position"
    # Kept for legacy session JSON only (not offered in the log UI).
    BOTH = "both"


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
    model_config = ConfigDict(
        populate_by_name=True,
        serialize_by_alias=True,
        extra="ignore",
    )

    id: str = Field(default_factory=lambda: str(uuid4()), alias="id")
    ball_number: int = Field(ge=1, le=9, alias="ballNumber")
    types: list[MissType] = Field(default_factory=list)
    outcome: MissOutcome
    # Legacy JSON field; metrics derive run-breaking from ``outcome`` only.
    ends_run: Optional[bool] = Field(default=None, alias="endsRun")
    created_at: str = Field(default_factory=utc_now_iso, alias="createdAt")

    @field_validator("types", mode="before")
    @classmethod
    def _strip_legacy_combined_type(cls, v: object) -> object:
        if not isinstance(v, list):
            return v
        return [x for x in v if str(x) != "combined"]


class RackRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    id: str = Field(default_factory=lambda: str(uuid4()), alias="id")
    rack_number: int = Field(ge=1, alias="rackNumber")
    started_at: str = Field(default_factory=utc_now_iso, alias="startedAt")
    ended_at: Optional[str] = Field(default=None, alias="endedAt")
    balls_cleared: Optional[int] = Field(default=None, ge=0, le=9, alias="ballsCleared")
    misses: list[MissEvent] = Field(default_factory=list)


class MissTypeCounts(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        serialize_by_alias=True,
        extra="ignore",
    )

    position: int = 0
    alignment: int = 0
    delivery: int = 0
    speed: int = 0


def _unwrap_legacy_id_object(value: object) -> object:
    """Older session JSON sometimes stored programId/planId as ``{\"id\": \"uuid\"}``."""
    if isinstance(value, dict) and isinstance(value.get("id"), str):
        return value["id"]
    return value


def _unwrap_legacy_table_type(value: object) -> object:
    if isinstance(value, dict):
        if isinstance(value.get("id"), str):
            return value["id"]
        if isinstance(value.get("value"), str):
            return value["value"]
    return value


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
    duration_seconds: int = Field(default=0, ge=0, alias="durationSeconds")
    is_paused: bool = Field(default=False, alias="isPaused")
    last_unpaused_at: Optional[str] = Field(default=None, alias="lastUnpausedAt")
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
    
    # New True Miss KPIs
    true_miss_count: int = Field(default=0, ge=0, alias="trueMissCount")
    training_miss_count: int = Field(default=0, ge=0, alias="trainingMissCount")
    avg_balls_before_true_miss: Optional[float] = Field(
        default=None, alias="avgBallsBeforeTrueMiss"
    )
    # Sum of ballsCleared over ended racks; used with training_miss_count for flow efficiency.
    total_balls_cleared: int = Field(default=0, ge=0, alias="totalBallsCleared")
    # Flow efficiency (UI name): balls cleared / (balls cleared + training misses).
    conversion_efficiency: Optional[float] = Field(
        default=None, ge=0, le=1, alias="conversionEfficiency"
    )
    # True misses ÷ ended racks (hard failure rate).
    true_miss_rate: Optional[float] = Field(default=None, ge=0, alias="trueMissRate")
    # Ended racks with full clearance (9) vs ended racks (run-out rate).
    racks_completed: int = Field(default=0, ge=0, alias="racksCompleted")
    rack_conversion_rate: Optional[float] = Field(
        default=None, ge=0, le=1, alias="rackConversionRate"
    )
    # Pot success: balls potted (ended racks) ÷ (potted + logged pot_miss / both). No-shot & playable
    # do not add failed pot attempts — balls never reached are not counted as misses here.
    pot_miss_shot_count: int = Field(default=0, ge=0, alias="potMissShotCount")
    pot_attempts: int = Field(default=0, ge=0, alias="potAttempts")
    pot_success_rate: Optional[float] = Field(
        default=None, ge=0, le=1, alias="potSuccessRate"
    )
    # docs/metric-position-success.md — miss-only: 1 − (position-related misses ÷ balls cleared).
    # Position-related = no-shot/both outcomes, or misses tagged position **or** speed.
    position_related_miss_count: int = Field(
        default=0, ge=0, alias="positionRelatedMissCount"
    )
    position_success_rate: Optional[float] = Field(
        default=None, ge=0, le=1, alias="positionSuccessRate"
    )
    # Balls cleared per rack spread (consistency); avg matches avgBallsClearedPerRack.
    worst_rack_balls_cleared: Optional[int] = Field(
        default=None, ge=0, le=9, alias="worstRackBallsCleared"
    )
    best_rack_balls_cleared: Optional[int] = Field(
        default=None, ge=0, le=9, alias="bestRackBallsCleared"
    )

    # Resilience (recovery-metric.md): after a training miss, did the rack stay alive?
    recovery_count: int = Field(default=0, ge=0, alias="recoveryCount")
    failed_recovery_count: int = Field(default=0, ge=0, alias="failedRecoveryCount")
    recovery_rate: Optional[float] = Field(
        default=None, ge=0, le=1, alias="recoveryRate"
    )
    failed_recovery_rate: Optional[float] = Field(
        default=None, ge=0, le=1, alias="failedRecoveryRate"
    )

    no_shot_position_count: int = Field(default=0, ge=0, alias="noShotPositionCount")
    miss_type_counts: MissTypeCounts = Field(
        default_factory=MissTypeCounts, alias="missTypeCounts"
    )
    racks: list[RackRecord] = Field(default_factory=list)
    current_rack_id: Optional[str] = Field(default=None, alias="currentRackId")

    @model_validator(mode="before")
    @classmethod
    def _coerce_legacy_embedded_ids(cls, data: object) -> object:
        if isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict):
            return cls._coerce_legacy_embedded_ids(data[0])
        if not isinstance(data, dict):
            return data
        out = dict(data)
        # Some exports / APIs wrap the document (e.g. ``{"session": {...}}``); unwrap before field checks.
        for wrap_key in ("session", "data", "payload", "record", "body"):
            inner = out.get(wrap_key)
            if not isinstance(inner, dict):
                continue
            if any(
                k in inner
                for k in (
                    "programId",
                    "program_id",
                    "program",
                    "planId",
                    "plan_id",
                    "plan",
                    "tableType",
                    "table_type",
                    "table",
                )
            ):
                merged = dict(inner)
                for k, v in out.items():
                    if k == wrap_key:
                        continue
                    merged.setdefault(k, v)
                out = merged
                break
        # Older exports used nested ``program`` / ``plan`` objects instead of programId/planId strings.
        if "programId" not in out and "program_id" not in out and "program" in out:
            out["programId"] = out.pop("program")
        if "planId" not in out and "plan_id" not in out and "plan" in out:
            out["planId"] = out.pop("plan")
        if "tableType" not in out and "table_type" not in out and "table" in out:
            out["tableType"] = out.pop("table")
        for key in ("programId", "program_id"):
            if key in out:
                out[key] = _unwrap_legacy_id_object(out[key])
        for key in ("planId", "plan_id"):
            if key in out:
                out[key] = _unwrap_legacy_id_object(out[key])
        for key in ("tableType", "table_type"):
            if key in out:
                out[key] = _unwrap_legacy_table_type(out[key])
        return out

    def current_rack(self) -> Optional[RackRecord]:
        if not self.current_rack_id:
            return None
        for r in self.racks:
            if r.id == self.current_rack_id:
                return r
        return None


def _strict_four_ascending_tier(name: str, v: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    a, b, c, d = v
    if not (a < b < c < d):
        raise ValueError(f"{name} must be four strictly ascending values")
    return v


class TierSettings(BaseModel):
    """
    Matrix tier model (docs/matrix-calculation-of-tier.md).

    Each ``*_pct_lower_bounds`` tuple is (b0,b1,b2,b3): score 0 if pct < b0, score 1 if
    b0<=pct<b1, … score 4 if pct>=b3. Percent values are on the usual 0–100 display scale.

    Internal composite is still 0–4 (weighted KPI scores). **Tier points** = composite ×
    ``composite_points_scale`` (default 1000 → whole-number UI, e.g. 0–4000).
    ``composite_points_upper_bounds`` are exclusive upper limits on tier points (same
    roles as legacy 1,2,3,3.5 composite cuts when scale=1000).
    """

    pot_pct_lower_bounds: tuple[float, float, float, float] = (90.0, 93.0, 95.0, 97.0)
    pos_pct_lower_bounds: tuple[float, float, float, float] = (55.0, 65.0, 75.0, 85.0)
    conv_pct_lower_bounds: tuple[float, float, float, float] = (20.0, 35.0, 50.0, 65.0)

    weight_pos: float = Field(default=0.5, ge=0.0, le=1.0)
    weight_conv: float = Field(default=0.3, ge=0.0, le=1.0)
    weight_pot: float = Field(default=0.2, ge=0.0, le=1.0)

    composite_points_scale: int = Field(default=1000, ge=50, le=50_000)
    composite_points_upper_bounds: tuple[int, int, int, int] = (1000, 2000, 3000, 3500)

    @model_validator(mode="before")
    @classmethod
    def _migrate_legacy_composite(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        d = dict(data)
        if "composite_points_upper_bounds" not in d and "composite_upper_bounds" in d:
            scale = int(d.get("composite_points_scale", 1000))
            legacy = d.pop("composite_upper_bounds")
            d["composite_points_upper_bounds"] = tuple(
                int(round(float(x) * scale)) for x in legacy
            )
        return d

    @field_validator("pot_pct_lower_bounds", "pos_pct_lower_bounds", "conv_pct_lower_bounds")
    @classmethod
    def validate_kpi_bounds(
        cls, v: tuple[float, float, float, float]
    ) -> tuple[float, float, float, float]:
        return _strict_four_ascending_tier("KPI lower bounds", v)

    @field_validator("composite_points_upper_bounds")
    @classmethod
    def validate_points_bounds_tuple(
        cls, v: tuple[int, int, int, int]
    ) -> tuple[int, int, int, int]:
        a, b, c, d = v
        if not (a < b < c < d):
            raise ValueError("Composite tier point cuts must be four strictly ascending integers")
        if a < 1:
            raise ValueError("First composite point cut must be at least 1")
        return v

    @model_validator(mode="after")
    def weights_sum_to_one(self) -> TierSettings:
        s = self.weight_pos + self.weight_conv + self.weight_pot
        if abs(s - 1.0) > 0.01:
            raise ValueError("Weights must sum to 1.0 (within 0.01)")
        return self

    @model_validator(mode="after")
    def composite_points_within_ceiling(self) -> TierSettings:
        cap = self.composite_points_scale * 4
        hi = self.composite_points_upper_bounds[-1]
        if hi >= cap:
            raise ValueError(
                f"Last composite point cut must be less than {cap} (4 × scale) so Elite has a band"
            )
        return self


TIER_LABELS: tuple[str, str, str, str, str] = (
    "Inconsistent / developing",
    "Strong amateur",
    "Advanced",
    "Semi-pro",
    "Elite",
)
