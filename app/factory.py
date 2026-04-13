from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request

from app.config import STATIC_DIR
from app.routers import api_ai_coach, api_programs, api_sessions, dashboard, profiles, settings, training
from app.services import programs_repo
from app.services.active_profile import attach_profile_context, set_profile_cookie


@asynccontextmanager
async def lifespan(_app: FastAPI):
    programs_repo.ensure_dev_seed()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Elite Training", lifespan=lifespan)

    @app.middleware("http")
    async def profile_context_middleware(request: Request, call_next):
        cookie_val = attach_profile_context(request)
        response = await call_next(request)
        if cookie_val:
            set_profile_cookie(response, cookie_val)
        return response

    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    metronic_assets_dir = Path(
        r"c:\workspace\metronic-v9.4.7\metronic-tailwind-html-starter-kit\dist\assets"
    )
    if metronic_assets_dir.is_dir():
        app.mount(
            "/metronic",
            StaticFiles(directory=str(metronic_assets_dir)),
            name="metronic",
        )

    app.include_router(dashboard.router)
    app.include_router(profiles.router)
    app.include_router(settings.router)
    app.include_router(training.router)
    app.include_router(api_programs.router)
    app.include_router(api_sessions.router)
    app.include_router(api_ai_coach.router)

    return app
