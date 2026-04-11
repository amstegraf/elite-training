from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = ROOT_DIR / "templates"
STATIC_DIR = ROOT_DIR / "static"

# v1 precision training data (JSON)
DATA_DIR = ROOT_DIR / "data"
PROGRAMS_FILE = DATA_DIR / "programs.json"
SESSIONS_DIR = DATA_DIR / "sessions"
