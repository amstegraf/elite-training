# Elite Training

Web app for **No Error** pool training: sessions (UUID + JSON file under `sessions/`), blocks, PR / FR / CPR, active timers, dashboard with session modal, and weekly reports.

Full product intent is described in [docs/training-platform-description.md](docs/training-platform-description.md).

## Requirements

- Python 3.11+

## Install

```bash
cd elite-training
python -m venv .venv
```

Activate the virtual environment:

- **Windows (PowerShell):** `.venv\Scripts\Activate.ps1`
- **macOS / Linux:** `source .venv/bin/activate`

Then install dependencies:

```bash
pip install -r requirements.txt
```

Alternatively, install the project in editable mode (same dependencies as `pyproject.toml`):

```bash
pip install -e .
```

## Run

From the project root, with the venv activated:

```bash
python main.py
```

Default bind address is `127.0.0.1` and port **8000**. Override the port:

```bash
python main.py --port 8080
```

Optional host:

```bash
python main.py --host 0.0.0.0 --port 8000
```

Open **http://127.0.0.1:8000** in your browser.

## Desktop (Electron)

Run Elite Training in its own window (starts the same Python server on **127.0.0.1:8765** by default):

1. Install [Node.js](https://nodejs.org/) (LTS is fine).
2. From the project root, with Python dependencies already installed in a venv (recommended):

   ```bash
   npm install
   npm run electron
   ```

The shell prefers **`.venv`** (`Scripts\\python.exe` on Windows, `bin/python` on macOS/Linux), then falls back to `python` / `python3` on your `PATH`.

- Override port: set environment variable **`ELITE_TRAINING_PORT`** (e.g. `8766`) before `npm run electron`.
- Close the window to stop the app (the server process is torn down).

### Windows installer (shortcut + 9-ball icon)

The desktop icon matches **`static/favicon.svg`** (rasterized to **`electron/icon.png`**).

1. Complete the Python venv and `pip install -e .` (or `pip install -r requirements.txt`) as above.
2. From the project root:

   ```bash
   npm install
   npm run build:desktop
   ```

3. **Windows:** open **`%LOCALAPPDATA%\EliteTraining\desktop-dist\`** in File Explorer (paste into the address bar). Run the **NSIS** setup (`.exe`) from there. That folder is **outside the git repo** on purpose so **Cursor** (and similar tools) do not keep handles on **`dist-desktop`** under the project and block **electron-builder** from replacing **`app.asar`**. **macOS / Linux:** output stays in **`dist-desktop/`** at the repo root.

If a build still fails with **“cannot access … app.asar”**, quit **Elite Training.exe** if it is running, then try again. **`npm run build:desktop`** attempts to stop that process first on Windows.

The packaged app still runs **your machine’s Python**. It uses the folder **`resources\elite-training\`** under the install directory as the project root (same layout as this repo: `app/`, `static/`, etc.). It prefers **`.venv`** there (`resources\elite-training\.venv\Scripts\python.exe`), then **`python`** on your `PATH`. After installing, create that venv inside `resources\elite-training\` and `pip install -e .`, or install the same dependencies into a Python that is on `PATH`.

You can also run Uvicorn directly:

```bash
uvicorn app.factory:create_app --factory --host 127.0.0.1 --port 8000
```

## Project layout

| Path | Role |
|------|------|
| `main.py` | CLI (`--port`, `--host`) and `uvicorn.run` |
| `app/factory.py` | FastAPI app, static mount, routers |
| `app/services/session_store.py` | Load/save `sessions/{uuid}.json` |
| `templates/` | Jinja layouts by area (`dashboard/`, `session/`, `reports/`, `partials/`) |
| `static/css/`, `static/js/` | Scoped assets (`common/`, `dashboard/`, `session/`, `reports/`) |
| `sessions/` | Runtime JSON (ignored by git except `.gitkeep`) |

## Usage (short)

1. **Dashboard** — Start a session, open it to train, or **View** to open a read-only modal.
2. **Session** — Begin training, add blocks, set current block, **Pause** / **Resume**, log **PR** / **FR**, end or abandon.
3. **Reports** — Weekly charts (PR, FR, hours, best CPR) and personal bests.

Session files are written atomically to `sessions/<uuid>.json`.
