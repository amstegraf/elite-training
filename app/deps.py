from functools import lru_cache

from fastapi.templating import Jinja2Templates

from app.config import TEMPLATES_DIR
from app.formatting import format_duration_ms


@lru_cache
def get_templates() -> Jinja2Templates:
    t = Jinja2Templates(directory=str(TEMPLATES_DIR))
    t.env.filters["format_duration_ms"] = format_duration_ms
    return t
