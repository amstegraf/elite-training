from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SessionStatus(str, Enum):
    CREATED = "created"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class TrainingBlock(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = "Block"
    purpose: str = ""
    # One-line block summary (optional). Used for accountability and quick scanning.
    summary: Optional[str] = None
    # Bullet-like details. Stored as a list so we can render cleanly as <ul>.
    details: list[str] = Field(default_factory=list)
    target: Optional[str] = None
    block_active_ms: int = 0
    pr: int = 0
    fr: int = 0
    attempts: int = 0
    cpr_current: int = 0
    cpr_best: int = 0
    notes: Optional[str] = None
    completed: bool = False


class TrainingSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    status: SessionStatus = SessionStatus.CREATED
    started_at: str = Field(default_factory=utc_now_iso)
    ended_at: Optional[str] = None
    notes: Optional[str] = None
    focus: Optional[str] = None
    venue_notes: Optional[str] = None
    session_active_ms: int = 0
    last_resume_at: Optional[str] = None
    blocks: list[TrainingBlock] = Field(default_factory=list)
    current_block_id: Optional[str] = None

    def current_block(self) -> Optional[TrainingBlock]:
        if not self.current_block_id:
            return None
        for b in self.blocks:
            if b.id == self.current_block_id:
                return b
        return None
