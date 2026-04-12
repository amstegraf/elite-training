from __future__ import annotations

import sys
import tomllib
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def read_pyproject_about() -> dict[str, str]:
    """Version and description from ``pyproject.toml`` when present."""
    path = _PROJECT_ROOT / "pyproject.toml"
    version = "—"
    description = ""
    if path.is_file():
        try:
            with path.open("rb") as f:
                data = tomllib.load(f)
            proj = data.get("project", {})
            version = str(proj.get("version", version))
            description = str(proj.get("description", ""))
        except (OSError, tomllib.TOMLDecodeError, TypeError, KeyError):
            pass
    return {"version": version, "description": description}


def about_page_context() -> dict[str, str]:
    meta = read_pyproject_about()
    return {
        "app_version": meta["version"],
        "app_description": meta["description"] or "Pool training sessions, metrics, and progression.",
        "python_version": sys.version.split()[0],
        "project_root_name": _PROJECT_ROOT.name,
    }
