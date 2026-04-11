from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import STATIC_DIR
from app.routers import api_programs, api_sessions, dashboard, training
from app.services import programs_repo


@asynccontextmanager
async def lifespan(_app: FastAPI):
    programs_repo.ensure_dev_seed()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Elite Training", lifespan=lifespan)
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
    app.include_router(training.router)
    app.include_router(api_programs.router)
    app.include_router(api_sessions.router)

    return app
