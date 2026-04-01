"""Run the training app with Uvicorn. Use --port to choose the listen port."""

from __future__ import annotations

import argparse

import uvicorn

from app.factory import create_app


def main() -> None:
    parser = argparse.ArgumentParser(description="Elite Training web server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address")
    parser.add_argument("--port", type=int, default=8000, help="Listen port")
    args = parser.parse_args()
    app = create_app()
    uvicorn.run(app, host=args.host, port=args.port, reload=False)


if __name__ == "__main__":
    main()
