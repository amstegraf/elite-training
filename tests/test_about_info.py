from __future__ import annotations

import json
from pathlib import Path

from app.services import about_info
from app.services.about_info import about_page_context, read_pyproject_about


def test_read_package_json_version_matches_repo() -> None:
    root = Path(__file__).resolve().parent.parent
    pkg = json.loads((root / "package.json").read_text(encoding="utf-8"))
    v = about_info.read_package_json_version()
    assert v == pkg["version"]


def test_read_pyproject_about_has_version() -> None:
    meta = read_pyproject_about()
    assert meta["version"] and meta["version"] != "—"
    assert "elite" in meta["description"].lower() or "pool" in meta["description"].lower()


def test_about_page_context_keys() -> None:
    ctx = about_page_context()
    root = Path(__file__).resolve().parent.parent
    pkg = json.loads((root / "package.json").read_text(encoding="utf-8"))
    assert ctx["app_version"] == pkg["version"]
    assert ctx["python_version"]
    assert ctx["project_root_name"]
