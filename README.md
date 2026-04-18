# Elite Training

Web app for **No Error** pool training: sessions (UUID + JSON file under **`data/sessions/`**), blocks, PR / FR / CPR, active timers, dashboard with session modal, and weekly reports.

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

Run Elite Training in its own window (starts the same Python server on **port 8765** by default):

1. Install [Node.js](https://nodejs.org/) (LTS is fine).
2. From the project root, with Python dependencies already installed in a venv (recommended):

   ```bash
   npm install
   npm run electron
   ```

The shell prefers **`.venv`** (`Scripts\\python.exe` on Windows, `bin/python` on macOS/Linux), then falls back to `python` / `python3` on your `PATH`.

- Override port: set environment variable **`ELITE_TRAINING_PORT`** (e.g. `8766`) before `npm run electron`.
- LAN bind for phone pairing is on by default (`0.0.0.0`). Set **`ELITE_TRAINING_LAN=0`** to force localhost-only mode.
- Close the window to stop the app (the server process is torn down).

In the desktop app, use **File → Import sessions…** to send **v1** session **`.json`**, or **File → Open session data folder** to reveal **`programs.json`** and **`sessions/`** in Explorer / Finder. (from **`data/sessions/`** or another machine’s `data/sessions/`) to the **running server** (`POST /api/sessions/import`). Files under the legacy **`sessions/`** folder use a **different format** and are not valid for this import. Use **Help → About Elite Training** (Windows/Linux) or the **application menu → About** (macOS) to see the **desktop shell version** from `package.json`. If a session id already exists, you can overwrite or skip.

### Windows installer (shortcut + 9-ball icon)

The desktop icon matches **`static/favicon.png`** (rasterized to **`electron/icon.png`**).

1. Ensure Python is installed on the machine (no manual `pip install` needed for players).
2. From the project root:

   ```bash
   npm install
   npm run build:desktop
   ```

3. **Windows:** open **`%LOCALAPPDATA%\EliteTraining\desktop-dist\`** in File Explorer (paste into the address bar). Run the **NSIS** setup (`.exe`) from there. That folder is **outside the git repo** on purpose so **Cursor** (and similar tools) do not keep handles on **`dist-desktop`** under the project and block **electron-builder** from replacing **`app.asar`**. **macOS / Linux:** output stays in **`dist-desktop/`** at the repo root.

If a build still fails with **“cannot access … app.asar”**, quit **Elite Training.exe** if it is running, then try again. **`npm run build:desktop`** attempts to stop that process first on Windows.

The packaged app runs with **your machine's Python**, but now bootstraps dependencies automatically on first launch into a private runtime under `%APPDATA%\elite-training-desktop\python-runtime\`. Players do not need to run `pip install` manually. First launch may take longer while dependencies install (internet access required for that step).

**Where saves live (desktop install):** **`programs.json`** and **`data/sessions/*.json`** are stored under Electron’s **user data** folder, not under `Program Files`, so they **survive reinstall** and are **not** removed by the default uninstaller (NSIS is configured with **`deleteAppDataOnUninstall: false`**). On Windows this is typically **`%APPDATA%\elite-training-desktop\precision-data\`** (under **Roaming**). Delete that folder yourself if you want a full wipe. **`npm run electron`** from the repo still uses **`./data/`** in the project (no `AppData` override). Advanced: set **`ELITE_TRAINING_DATA_DIR`** before starting Python to force any directory.

**Installer / shortcut version:** The Windows setup file name comes from **`version`** in root **`package.json`** (e.g. `Elite Training Setup 0.1.1.exe`). Bump that string when you ship a new desktop build; keep **`pyproject.toml`** `version` in sync if you like, so Python and Electron stay aligned. You do **not** have to bump the version for import fixes to apply, but a higher version makes it obvious you installed a new build.

You can also run Uvicorn directly:

```bash
uvicorn app.factory:create_app --factory --host 127.0.0.1 --port 8000
```

## Android mobile companion (V1)

V1 mobile support is Android-only and focuses on **logging misses** into the currently running desktop session.

### Pairing flow

1. Start a live session on desktop (`/session/{id}`).
2. In the right sidebar, open **Connect app** and click **Show QR**.
3. On Android, open the app and allow camera permission.
4. In the app, point camera to the QR (or use manual URL fallback).
5. When connected, use the mobile controls to log misses (ball, types, outcome).
6. Keep desktop and phone on the same Wi-Fi/LAN while training.

The QR contains:

- `baseUrl` (desktop app LAN URL)
- `sessionId`
- short-lived `token` used as `Authorization: Bearer ...`

Phone and desktop must be on the same network. If pairing fails on Windows, allow the app/python process through firewall on private networks.

### If QR does not appear

The desktop app now generates QR images server-side (no CDN dependency), so a blank box usually means Python deps are stale.

1. Reinstall backend deps:
   - `pip install -r requirements.txt`
2. Restart the desktop app.
3. Open live session and click **Refresh QR**.
4. If still empty, use **Copy URL** and connect manually in the Android app.

### Android app project

Source is under `mobile/android/` (Kotlin + Jetpack Compose + CameraX/MLKit).

### Step-by-step: build and install from command line (no Android Studio required)

1. Install toolchain on Windows (PowerShell):

```powershell
winget install -e --id EclipseAdoptium.Temurin.17.JDK
winget install -e --id Gradle.Gradle
```

2. Close/reopen terminal, then verify tools:

```powershell
java -version
gradle -v
```

3. Install Android SDK Command-line Tools (if you do not have Android SDK yet):
   - Download **Command line tools only** (Windows) from [Android Studio downloads](https://developer.android.com/studio#command-tools).
   - Extract to:
     - `C:\Users\aurel\AppData\Local\Android\Sdk\cmdline-tools\latest\`
   - After extraction, this should exist:
     - `C:\Users\aurel\AppData\Local\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat`
   - Add to PATH (new terminal afterward):
     - `C:\Users\aurel\AppData\Local\Android\Sdk\platform-tools`
     - `C:\Users\aurel\AppData\Local\Android\Sdk\cmdline-tools\latest\bin`

4. Set Android SDK environment variables (new terminal afterward):

```powershell
setx ANDROID_SDK_ROOT "C:\Users\aurel\AppData\Local\Android\Sdk"
setx ANDROID_HOME "C:\Users\aurel\AppData\Local\Android\Sdk"
```

5. Install required Android SDK packages:

```powershell
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

6. On your phone:
   - Enable **Developer options**
   - Enable **USB debugging**
   - Connect by USB and accept the RSA debugging prompt

7. From repo root, go to mobile project:

```powershell
cd mobile/android
```

8. Create `local.properties` so Gradle knows SDK path:

```properties
sdk.dir=C:\\Users\\aurel\\AppData\\Local\\Android\\Sdk
```

9. Generate Gradle wrapper (one time) if `gradlew.bat` is missing:

```powershell
gradle wrapper --gradle-version 8.7
```

10. Build and install debug APK:

```powershell
.\gradlew.bat installDebug
```

11. If no device is detected:

```powershell
adb devices
```

Note: `npm install gradle` does not install the system `gradle` command.

### Windows firewall + LAN access (required for phone connection)

Desktop UI can work locally while phone connection fails if Windows firewall blocks LAN inbound traffic.

Desktop installer note: Windows NSIS installer now attempts to auto-create inbound rules for
`8765` (default) and `8889` (common override) on **Private** profile during install.
If you run a different custom port, add a matching rule manually.

Desktop diagnostics: when startup/bootstrap fails, the app now stores logs at:
`%APPDATA%\elite-training-desktop\logs\desktop-latest.log`
and native crash dumps under:
`%APPDATA%\elite-training-desktop\crashes\`

1. Make sure phone and desktop are on the same Wi-Fi/LAN.
2. From the phone browser, open the URL shown in the app QR fallback (example: `http://192.168.1.113:8889/mobile/connect?...`).
   - If this opens, network path is okay.
   - If it fails, allow firewall access below.

#### Allow through firewall (GUI)

1. Open **Windows Security** → **Firewall & network protection** → **Allow an app through firewall**.
2. Click **Change settings**.
3. Ensure **Private** is enabled for:
   - `python.exe` (or your venv Python)
   - `Elite Training` / `electron.exe` (if listed)
4. Retry phone connection.

#### Alternative: open the app port directly

If app entries are missing, create an inbound rule for your running port (example `8889`):

1. Open **Windows Defender Firewall with Advanced Security**.
2. Go to **Inbound Rules** → **New Rule**.
3. Select **Port** → **TCP** → specific local port: `8889`.
4. **Allow the connection**.
5. Apply to **Private** profile.

PowerShell (Admin) equivalent:

```powershell
New-NetFirewallRule -DisplayName "Elite Training 8889" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8889 -Profile Private
```

### Step-by-step: what to do on phone during training

1. Open **Elite Training Mobile** on the phone.
2. Stay on the **Scan Session QR** screen.
3. Scan QR shown in desktop live session (`Connect app` card).
4. Confirm it shows connected session id.
5. Select:
   - missed ball (`1-9`)
   - miss types (`position`, `alignment`, `delivery`, `speed`)
   - outcome (`playable`, `pot_miss`, `no_shot_position`)
6. Tap **Save miss** for each miss event.
7. If connection drops, tap **Disconnect** and scan QR again.

## Project layout

| Path | Role |
|------|------|
| `main.py` | CLI (`--port`, `--host`) and `uvicorn.run` |
| `app/factory.py` | FastAPI app, static mount, routers |
| `app/services/sessions_repo.py` | Load/save `data/sessions/{uuid}.json` |
| `templates/` | Jinja layouts by area (`dashboard/`, `session/`, `reports/`, `partials/`) |
| `static/css/`, `static/js/` | Scoped assets (`common/`, `dashboard/`, `session/`, `reports/`) |
| `data/sessions/` | **Current** precision-training session JSON (`PrecisionSession`; used by the app) |
| `sessions/` (repo root) | **Obsolete** legacy MVP format (`blocks`, `pr` / `fr`, snake_case times, …). **Not** the same schema as `data/sessions/`; do not use **Import sessions** for these files—they will fail validation. Kept only as an archive; `.gitignore` ignores `sessions/*.json`. |

### Two session folders (important)

- **`data/sessions/`** — What the app reads and writes today. Files include **`programId`**, **`planId`**, **`tableType`**, racks/misses, etc.
- **`sessions/`** — Older experiment; JSON describes **blocks** and **PR/FR** style metrics, not a `PrecisionSession`. There is **no** automatic import from here into the precision app; you would need a one-off migration script if you ever want that data converted.

## Usage (short)

1. **Dashboard** — Start a session, open it to train, or **View** to open a read-only modal.
2. **Session** — Begin training, add blocks, set current block, **Pause** / **Resume**, log **PR** / **FR**, end or abandon.
3. **Reports** — Weekly charts (PR, FR, hours, best CPR) and personal bests.

Session files are written atomically to `data/sessions/<uuid>.json`.
