from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import STATIC_DIR
from app.routers import api_session, dashboard, partials, reports, session_live


def create_app() -> FastAPI:
    app = FastAPI(title="Elite Training")
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    app.include_router(dashboard.router)
    app.include_router(session_live.router)
    app.include_router(partials.router)
    app.include_router(reports.router)
    app.include_router(api_session.router)

    return app
