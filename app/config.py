import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = ROOT_DIR / "templates"
STATIC_DIR = ROOT_DIR / "static"

# v1 precision training data (JSON). Override with ELITE_TRAINING_DATA_DIR (e.g. Electron userData).
_raw_data = os.environ.get("ELITE_TRAINING_DATA_DIR", "").strip()
if _raw_data:
    DATA_DIR = Path(_raw_data).expanduser().resolve()
else:
    DATA_DIR = ROOT_DIR / "data"

PROGRAMS_FILE = DATA_DIR / "programs.json"
SESSIONS_DIR = DATA_DIR / "sessions"

DATA_DIR.mkdir(parents=True, exist_ok=True)
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
