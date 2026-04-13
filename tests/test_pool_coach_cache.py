from __future__ import annotations

from pathlib import Path

import pytest

from app.services.pool_coach_cache import (
    delete_progress_coach_cache,
    delete_session_coach_cache,
    has_progress_coach_cache,
    has_session_coach_cache,
    load_progress_coach_cache,
    load_session_coach_cache,
    save_progress_coach_cache,
    save_session_coach_cache,
)


def test_session_coach_cache_roundtrip(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.pool_coach_cache.app_config.SESSIONS_DIR", tmp_path)
    save_session_coach_cache(
        "sess-1",
        {"output_text": "Analysis", "ok": True, "blocked": False},
    )
    assert has_session_coach_cache("sess-1")
    hit = load_session_coach_cache("sess-1")
    assert hit is not None
    assert hit["response"]["outputText"] == "Analysis"
    delete_session_coach_cache("sess-1")
    assert not has_session_coach_cache("sess-1")


def test_progress_coach_respects_reference_session(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.services.pool_coach_cache.app_config.PROFILES_DIR", tmp_path)
    pid = "prof-1"
    save_progress_coach_cache(
        pid,
        {"output_text": "Old", "ok": True},
        reference_session_id="ref-a",
    )
    assert load_progress_coach_cache(pid, reference_session_id="ref-a") is not None
    assert load_progress_coach_cache(pid, reference_session_id="ref-b") is None
    assert load_progress_coach_cache(pid, reference_session_id=None) is None
    assert has_progress_coach_cache(pid, reference_session_id="ref-a")
    assert not has_progress_coach_cache(pid, reference_session_id=None)
    delete_progress_coach_cache(pid)
    assert not has_progress_coach_cache(pid, reference_session_id="ref-a")


def test_progress_coach_both_refs_null(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.services.pool_coach_cache.app_config.PROFILES_DIR", tmp_path)
    pid = "prof-2"
    save_progress_coach_cache(
        pid,
        {"output_text": "Hi", "ok": True},
        reference_session_id=None,
    )
    assert load_progress_coach_cache(pid, reference_session_id=None) is not None
    delete_progress_coach_cache(pid)
