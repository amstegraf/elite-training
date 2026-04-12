from __future__ import annotations

import json
import sys
import tomllib
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def read_package_json_version() -> str | None:
    """``version`` from repo ``package.json`` (desktop / npm metadata)."""
    path = _PROJECT_ROOT / "package.json"
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        v = data.get("version")
        if isinstance(v, str) and v.strip():
            return v.strip()
    except (OSError, json.JSONDecodeError, TypeError):
        pass
    return None


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
    pkg_ver = read_package_json_version()
    return {
        "app_version": pkg_ver if pkg_ver else meta["version"],
        "app_description": meta["description"] or "Pool training sessions, metrics, and progression.",
        "python_version": sys.version.split()[0],
        "project_root_name": _PROJECT_ROOT.name,
    }
