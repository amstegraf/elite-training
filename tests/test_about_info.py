from __future__ import annotations

from app.services.about_info import about_page_context, read_pyproject_about


def test_read_pyproject_about_has_version() -> None:
    meta = read_pyproject_about()
    assert meta["version"] and meta["version"] != "—"
    assert "elite" in meta["description"].lower() or "pool" in meta["description"].lower()


def test_about_page_context_keys() -> None:
    ctx = about_page_context()
    assert ctx["app_version"]
    assert ctx["python_version"]
    assert ctx["project_root_name"]
