from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import STATIC_DIR
from app.routers import api_session, dashboard, partials, reports, session_live


def create_app() -> FastAPI:
    app = FastAPI(title="Elite Training")
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    # Metronic v9.4.7 (local) assets. This keeps the app lightweight by serving
    # the existing Metronic dist files without copying them into this repo.
    metronic_assets_dir = r"c:\workspace\metronic-v9.4.7\metronic-tailwind-html-starter-kit\dist\assets"
    app.mount("/metronic", StaticFiles(directory=metronic_assets_dir), name="metronic")

    app.include_router(dashboard.router)
    app.include_router(session_live.router)
    app.include_router(partials.router)
    app.include_router(reports.router)
    app.include_router(api_session.router)

    return app
