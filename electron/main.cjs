/**
 * Elite Training desktop shell: starts the local FastAPI server, then opens it in a window.
 */
const { app, BrowserWindow, Menu, dialog } = require('electron');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PROJECT_ROOT = app.isPackaged
  ? path.join(process.resourcesPath, 'elite-training')
  : path.join(__dirname, '..');

const WINDOW_ICON = path.join(__dirname, 'icon.png');
const DEFAULT_PORT = process.env.ELITE_TRAINING_PORT
  ? parseInt(process.env.ELITE_TRAINING_PORT, 10)
  : 8765;

let serverProcess = null;
let mainWindow = null;

function dialogParent() {
  return BrowserWindow.getFocusedWindow() ?? mainWindow;
}

function sessionsDir() {
  return path.join(PROJECT_ROOT, 'data', 'sessions');
}

/** Validate session JSON with the same Pydantic model as the server; returns session id on success. */
function validateSessionAndGetId(absFilePath) {
  const python = resolvePythonExecutable();
  const script =
    'import os,sys;sys.path.insert(0,os.getcwd());' +
    'import json;' +
    'from app.models import PrecisionSession;' +
    'd=json.load(open(sys.argv[1],encoding="utf-8"));' +
    's=PrecisionSession.model_validate(d);' +
    'print(s.id)';
  const r = spawnSync(python, ['-c', script, absFilePath], {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
    windowsHide: true,
  });
  if (r.status !== 0) {
    const err = ((r.stderr || '') + (r.stdout || '')).trim() || 'Validation failed';
    return { ok: false, err };
  }
  const id = (r.stdout || '').trim();
  if (!id) return { ok: false, err: 'No session id returned' };
  return { ok: true, id };
}

async function importSessionsFromFiles() {
  const parent = dialogParent();
  if (!parent) return;

  const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
    title: 'Import session files',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Session JSON', extensions: ['json'] }],
  });
  if (canceled || !filePaths.length) return;

  const destDir = sessionsDir();
  fs.mkdirSync(destDir, { recursive: true });

  /** @type {{ src: string, id: string, base: string }[]} */
  const valid = [];
  /** @type {{ base: string, err: string }[]} */
  const invalid = [];

  for (const src of filePaths) {
    const v = validateSessionAndGetId(src);
    const base = path.basename(src);
    if (!v.ok) {
      invalid.push({ base, err: v.err });
      continue;
    }
    valid.push({ src, id: v.id, base });
  }

  const byId = new Map();
  for (const row of valid) {
    byId.set(row.id, row);
  }
  const unique = [...byId.values()];
  const dupCount = valid.length - unique.length;

  const existing = unique.filter((row) => fs.existsSync(path.join(destDir, `${row.id}.json`)));
  let overwriteExisting = false;
  let skipExisting = false;

  if (existing.length > 0) {
    const res = await dialog.showMessageBox(parent, {
      type: 'question',
      buttons: ['Overwrite', 'Skip existing', 'Cancel import'],
      defaultId: 1,
      cancelId: 2,
      title: 'Import sessions',
      message: `${existing.length} file(s) match session ids that already exist in this data folder.`,
      detail:
        existing.map((e) => e.id).join('\n') +
        '\n\nOverwrite replaces files on disk. Skip leaves existing files unchanged.',
    });
    if (res.response === 2) return;
    overwriteExisting = res.response === 0;
    skipExisting = res.response === 1;
  }

  let imported = 0;
  let skipped = 0;
  for (const row of unique) {
    const dest = path.join(destDir, `${row.id}.json`);
    if (fs.existsSync(dest)) {
      if (skipExisting) {
        skipped += 1;
        continue;
      }
      if (!overwriteExisting) {
        skipped += 1;
        continue;
      }
    }
    fs.copyFileSync(row.src, dest);
    imported += 1;
  }

  const parts = [`Imported ${imported} session(s).`];
  if (skipped) parts.push(`Skipped ${skipped}.`);
  if (dupCount > 0) parts.push(`${dupCount} duplicate id in selection (last file kept per id).`);
  if (invalid.length) parts.push(`${invalid.length} file(s) could not be read as sessions.`);

  await dialog.showMessageBox(parent, {
    type: invalid.length ? 'warning' : 'info',
    title: 'Import sessions',
    message: parts.join(' '),
    detail:
      invalid.length > 0
        ? invalid.map((i) => `${i.base}\n${i.err}`).join('\n\n---\n\n')
        : undefined,
  });

  if (imported > 0 && parent) {
    parent.webContents.reloadIgnoringCache();
  }
}

function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const fileSubmenu = [
    {
      label: 'Import sessions…',
      click: () => {
        importSessionsFromFiles().catch((err) => console.error(err));
      },
    },
    { type: 'separator' },
    isMac ? { role: 'close' } : { role: 'quit' },
  ];

  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    { label: 'File', submenu: fileSubmenu },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function resolvePythonExecutable() {
  const winVenv = path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe');
  const unixVenv = path.join(PROJECT_ROOT, '.venv', 'bin', 'python');
  if (fs.existsSync(winVenv)) return winVenv;
  if (fs.existsSync(unixVenv)) return unixVenv;
  if (process.platform === 'win32') return 'python';
  return 'python3';
}

function startServer(port) {
  const python = resolvePythonExecutable();
  const args = [
    '-m',
    'uvicorn',
    'app.factory:create_app',
    '--factory',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
  ];
  serverProcess = spawn(python, args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  serverProcess.stderr?.on('data', (buf) => {
    const line = buf.toString().trim();
    if (line) console.error('[server]', line);
  });
  serverProcess.stdout?.on('data', (buf) => {
    const line = buf.toString().trim();
    if (line) console.log('[server]', line);
  });
  serverProcess.on('error', (err) => {
    console.error('Failed to start Python server:', err.message);
  });
  serverProcess.on('exit', (code, signal) => {
    if (signal) console.log('Server process killed:', signal);
    else if (code !== 0 && code !== null) console.error('Server exited with code', code);
    serverProcess = null;
  });
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill();
    } catch (_) {
      /* ignore */
    }
    serverProcess = null;
  }
}

function waitForHttp(url, timeoutMs = 45000, intervalMs = 250) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    function ping() {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Server did not respond at ${url} within ${timeoutMs}ms`));
        } else {
          setTimeout(ping, intervalMs);
        }
      });
    }
    ping();
  });
}

function createWindow(port) {
  const url = `http://127.0.0.1:${port}/`;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'Elite Training',
    icon: fs.existsSync(WINDOW_ICON) ? WINDOW_ICON : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(url);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const port = DEFAULT_PORT;
  startServer(port);
  try {
    await waitForHttp(`http://127.0.0.1:${port}/`);
  } catch (e) {
    console.error(e.message);
    const python = resolvePythonExecutable();
    await dialog.showMessageBox({
      type: 'error',
      title: 'Elite Training',
      message: 'Could not start the app server.',
      detail:
        `Tried Python: ${python}\n` +
        'Use a venv with dependencies installed (pip install -e .), or set ELITE_TRAINING_PORT if the port is busy.',
    });
    app.quit();
    return;
  }
  createWindow(port);
  setupApplicationMenu();
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopServer();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverProcess) {
    createWindow(DEFAULT_PORT);
  }
});
