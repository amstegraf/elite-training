from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="Elite Training")

    @app.get("/")
    async def root() -> dict[str, str]:
        return {
            "name": "elite-training",
            "status": "ok",
            "note": "Wire templates and routers here as the UI is built out.",
        }

    return app
