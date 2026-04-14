/**
 * Elite Training desktop shell: starts the local FastAPI server, then opens it in a window.
 */
const { app, BrowserWindow, Menu, dialog, shell, crashReporter } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

const PROJECT_ROOT = app.isPackaged
  ? path.join(process.resourcesPath, 'elite-training')
  : path.join(__dirname, '..');

const WINDOW_ICON = path.join(__dirname, 'icon.png');
const DEFAULT_PORT = process.env.ELITE_TRAINING_PORT
  ? parseInt(process.env.ELITE_TRAINING_PORT, 10)
  : 8765;
const LAN_ENABLED = process.env.ELITE_TRAINING_LAN !== '0';

function isPrivateIpv4(ip) {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  );
}

function preferredLanAddress() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const rows of Object.values(nets)) {
    for (const row of rows || []) {
      if (!row || row.internal || row.family !== 'IPv4') continue;
      candidates.push(row.address);
    }
  }
  const privateCandidate = candidates.find((ip) => isPrivateIpv4(ip));
  return privateCandidate || candidates[0] || null;
}

function resolvePublicBaseUrl(port) {
  if (!LAN_ENABLED) return `http://127.0.0.1:${port}`;
  const ip = preferredLanAddress();
  if (!ip) return `http://127.0.0.1:${port}`;
  return `http://${ip}:${port}`;
}

/** Prefer the bundled tree (packaged) over any other ``app`` on PYTHONPATH / site-packages. */
function pythonProcessEnv() {
  const sep = path.delimiter;
  const env = {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    PYTHONNOUSERSITE: '1',
  };
  const tail = process.env.PYTHONPATH ? sep + process.env.PYTHONPATH : '';
  env.PYTHONPATH = PROJECT_ROOT + tail;
  if (userPrecisionDataDir) {
    env.ELITE_TRAINING_DATA_DIR = userPrecisionDataDir;
  }
  env.ELITE_TRAINING_PUBLIC_BASE_URL = resolvePublicBaseUrl(DEFAULT_PORT);
  return env;
}

let serverProcess = null;
let mainWindow = null;
/** Packaged installs: sessions + programs.json live here (survives reinstall). */
let userPrecisionDataDir = null;
let lastServerStderr = '';
/** Packaged installs: resolved python inside runtime venv after bootstrap. */
let runtimePythonPath = null;

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}
let logFilePath = null;

function nowIso() {
  return new Date().toISOString();
}

function appendLog(level, message) {
  if (!logFilePath) return;
  try {
    fs.appendFileSync(logFilePath, `[${nowIso()}] [${level}] ${String(message)}\n`, 'utf8');
  } catch (_) {
    /* ignore logging errors */
  }
}

function initLogging() {
  const logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  logFilePath = path.join(logDir, 'desktop-latest.log');

  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origErr = console.error.bind(console);
  console.log = (...args) => {
    origLog(...args);
    appendLog('INFO', args.join(' '));
  };
  console.warn = (...args) => {
    origWarn(...args);
    appendLog('WARN', args.join(' '));
  };
  console.error = (...args) => {
    origErr(...args);
    appendLog('ERROR', args.join(' '));
  };

  process.on('uncaughtException', (err) => {
    appendLog('FATAL', `uncaughtException: ${err && err.stack ? err.stack : String(err)}`);
  });
  process.on('unhandledRejection', (reason) => {
    appendLog('FATAL', `unhandledRejection: ${String(reason)}`);
  });

  crashReporter.start({
    uploadToServer: false,
    compress: true,
    crashesDirectory: path.join(app.getPath('userData'), 'crashes'),
  });

  appendLog('INFO', `Desktop startup. appVersion=${app.getVersion()} packaged=${app.isPackaged}`);
}

function readDesktopPackageJson() {
  try {
    const p = path.join(__dirname, '..', 'package.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return { version: 'unknown', name: 'elite-training-desktop', description: 'Elite Training' };
  }
}

function dialogParent() {
  return BrowserWindow.getFocusedWindow() ?? mainWindow;
}

function httpJsonRequest(method, port, pathUrl, bodyObj, extraHeaders) {
  const extra = extraHeaders && typeof extraHeaders === 'object' ? extraHeaders : {};
  const body =
    bodyObj !== undefined && bodyObj !== null ? JSON.stringify(bodyObj) : '';
  return new Promise((resolve, reject) => {
    const headers = { ...extra };
    if (body.length > 0) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(body, 'utf8'));
    }
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: pathUrl,
        method,
        headers,
      },
      (res) => {
        let chunks = '';
        res.setEncoding('utf8');
        res.on('data', (c) => {
          chunks += c;
        });
        res.on('end', () => {
          let json = null;
          if (chunks) {
            try {
              json = JSON.parse(chunks);
            } catch (_) {
              /* ignore */
            }
          }
          resolve({ status: res.statusCode || 0, text: chunks, json });
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(body, 'utf8');
    req.end();
  });
}

function httpSessionExists(port, sessionId) {
  return new Promise((resolve, reject) => {
    const enc = encodeURIComponent(sessionId);
    http
      .get(`http://127.0.0.1:${port}/api/sessions/${enc}`, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      })
      .on('error', () => resolve(false));
  });
}

function format422Detail(detail) {
  if (!Array.isArray(detail)) return JSON.stringify(detail);
  return detail.map((d) => `${(d.loc || []).join('.')}: ${d.msg || d.type || ''}`).join('\n');
}

function guessSessionIdFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.id === 'string') return payload.id;
  if (payload.session && typeof payload.session.id === 'string') return payload.session.id;
  return null;
}

async function resolveImportProfileId(port) {
  const r = await httpJsonRequest('GET', port, '/api/profiles');
  if (r.status !== 200 || !r.json || !Array.isArray(r.json.profiles) || r.json.profiles.length === 0) {
    return null;
  }
  const arr = [...r.json.profiles].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return arr[0].id;
}

async function importSessionsFromFiles() {
  const parent = dialogParent();
  if (!parent) return;

  const port = DEFAULT_PORT;

  const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
    title: 'Import session files',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Session JSON', extensions: ['json'] }],
  });
  if (canceled || !filePaths.length) return;

  const importProfileId = await resolveImportProfileId(port);
  if (!importProfileId) {
    await dialog.showMessageBox(parent, {
      type: 'warning',
      title: 'Import sessions',
      message: 'Create at least one player profile in the app before importing sessions.',
    });
    return;
  }

  /** @type {{ base: string, payload: object }[]} */
  const parsed = [];
  /** @type {{ base: string, err: string }[]} */
  const invalid = [];

  for (const src of filePaths) {
    const base = path.basename(src);
    let payload;
    try {
      payload = JSON.parse(fs.readFileSync(src, 'utf8'));
    } catch (e) {
      invalid.push({ base, err: e instanceof Error ? e.message : String(e) });
      continue;
    }
    const sid = guessSessionIdFromPayload(payload);
    if (!sid) {
      invalid.push({ base, err: 'Missing top-level id (or session.id) in JSON' });
      continue;
    }
    parsed.push({ base, payload });
  }

  const byId = new Map();
  for (const row of parsed) {
    const sid = guessSessionIdFromPayload(row.payload);
    byId.set(sid, row);
  }
  const unique = [...byId.values()];
  const dupCount = parsed.length - unique.length;

  const existing = [];
  for (const row of unique) {
    const sid = guessSessionIdFromPayload(row.payload);
    if (await httpSessionExists(port, sid)) existing.push(row);
  }

  let overwriteExisting = false;
  let skipExisting = false;

  if (existing.length > 0) {
    const res = await dialog.showMessageBox(parent, {
      type: 'question',
      buttons: ['Overwrite', 'Skip existing', 'Cancel import'],
      defaultId: 1,
      cancelId: 2,
      title: 'Import sessions',
      message: `${existing.length} session(s) already exist on this server.`,
      detail:
        existing.map((e) => guessSessionIdFromPayload(e.payload)).join('\n') +
        '\n\nOverwrite replaces files on disk. Skip leaves existing sessions unchanged.',
    });
    if (res.response === 2) return;
    overwriteExisting = res.response === 0;
    skipExisting = res.response === 1;
  }

  let imported = 0;
  let skipped = 0;

  for (const row of unique) {
    const sid = guessSessionIdFromPayload(row.payload);
    const exists = await httpSessionExists(port, sid);
    if (exists) {
      if (skipExisting) {
        skipped += 1;
        continue;
      }
      if (!overwriteExisting) {
        skipped += 1;
        continue;
      }
    }
    const q = exists && overwriteExisting ? '?overwrite=true' : '?overwrite=false';
    try {
      const r = await httpJsonRequest('POST', port, `/api/sessions/import${q}`, row.payload, {
        'X-Elite-Profile-Id': importProfileId,
      });
      if (r.status === 200 && r.json && r.json.ok) {
        imported += 1;
      } else if (r.status === 422) {
        invalid.push({
          base: row.base,
          err: format422Detail(r.json ? r.json.detail : r.text),
        });
      } else if (r.status === 409) {
        skipped += 1;
      } else {
        invalid.push({
          base: row.base,
          err: r.json ? JSON.stringify(r.json) : r.text || `HTTP ${r.status}`,
        });
      }
    } catch (e) {
      invalid.push({
        base: row.base,
        err: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const parts = [`Imported ${imported} session(s).`];
  if (skipped) parts.push(`Skipped ${skipped}.`);
  if (dupCount > 0) parts.push(`${dupCount} duplicate id in selection (last file kept per id).`);
  if (invalid.length) parts.push(`${invalid.length} file(s) could not be imported.`);

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

function sessionDataDirectory() {
  if (userPrecisionDataDir) return userPrecisionDataDir;
  return path.join(PROJECT_ROOT, 'data');
}

async function openSessionDataDirectory() {
  const dir = sessionDataDirectory();
  fs.mkdirSync(path.join(dir, 'sessions'), { recursive: true });
  const err = await shell.openPath(dir);
  if (err) {
    await dialog.showMessageBox(dialogParent() || undefined, {
      type: 'error',
      title: 'Elite Training',
      message: 'Could not open the session data folder.',
      detail: `${dir}\n\n${err}`,
    });
  }
}

function showAboutDialog() {
  const pkg = readDesktopPackageJson();
  const ver = pkg.version || 'unknown';
  const name = pkg.productName || pkg.description || 'Elite Training';
  dialog.showMessageBox(dialogParent() || undefined, {
    type: 'info',
    title: `About ${name}`,
    message: name,
    detail:
      `Version ${ver}\n` +
      (app.isPackaged ? 'Desktop install (packaged)\n' : 'Development (npm run electron)\n') +
      `Python app root:\n${PROJECT_ROOT}` +
      (userPrecisionDataDir
        ? `\n\nPrograms & sessions (persists across reinstall):\n${userPrecisionDataDir}`
        : '\n\nPrograms & sessions: ./data/ (repo folder in dev)'),
  });
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
    {
      label: 'Open session data folder',
      click: () => {
        openSessionDataDirectory().catch((err) => console.error(err));
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
              {
                label: `About ${app.name}`,
                click: () => showAboutDialog(),
              },
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
    ...(!isMac
      ? [
          {
            label: 'Help',
            submenu: [
              {
                label: 'About Elite Training',
                click: () => showAboutDialog(),
              },
            ],
          },
        ]
      : []),
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

function runtimePaths() {
  const runtimeDir = path.join(app.getPath('userData'), 'python-runtime');
  const venvDir = path.join(runtimeDir, '.venv');
  const venvPython =
    process.platform === 'win32'
      ? path.join(venvDir, 'Scripts', 'python.exe')
      : path.join(venvDir, 'bin', 'python');
  const stampPath = path.join(runtimeDir, '.requirements-stamp');
  return { runtimeDir, venvDir, venvPython, stampPath };
}

function requirementsFingerprint() {
  const pkg = readDesktopPackageJson();
  const reqPath = path.join(PROJECT_ROOT, 'requirements.txt');
  const req = fs.existsSync(reqPath) ? fs.readFileSync(reqPath, 'utf8') : '';
  return crypto.createHash('sha256').update(String(pkg.version)).update('\n').update(req).digest('hex');
}

function runSyncOrThrow(command, args, opts) {
  const res = require('child_process').spawnSync(command, args, {
    windowsHide: true,
    encoding: 'utf8',
    ...opts,
  });
  if (res.status === 0) return;
  const detail = [
    `Command: ${command} ${args.join(' ')}`,
    res.stdout ? `stdout:\n${res.stdout}` : '',
    res.stderr ? `stderr:\n${res.stderr}` : '',
    res.error ? `error: ${res.error.message}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  throw new Error(detail || `Command failed: ${command}`);
}

function ensurePackagedRuntimePython() {
  if (!app.isPackaged) return null;
  const { runtimeDir, venvDir, venvPython, stampPath } = runtimePaths();
  fs.mkdirSync(runtimeDir, { recursive: true });

  const expected = requirementsFingerprint();
  const current = fs.existsSync(stampPath) ? fs.readFileSync(stampPath, 'utf8').trim() : '';
  if (fs.existsSync(venvPython) && current === expected) {
    return venvPython;
  }

  const bootstrapPython = resolvePythonExecutable();
  if (!fs.existsSync(venvPython)) {
    runSyncOrThrow(bootstrapPython, ['-m', 'venv', venvDir], { cwd: PROJECT_ROOT });
  }

  const reqPath = path.join(PROJECT_ROOT, 'requirements.txt');
  runSyncOrThrow(
    venvPython,
    ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', reqPath],
    { cwd: PROJECT_ROOT },
  );

  fs.writeFileSync(stampPath, expected, 'utf8');
  return venvPython;
}

function packagedRuntimeNeedsBootstrap() {
  if (!app.isPackaged) return false;
  const { venvPython, stampPath } = runtimePaths();
  const expected = requirementsFingerprint();
  const current = fs.existsSync(stampPath) ? fs.readFileSync(stampPath, 'utf8').trim() : '';
  return !(fs.existsSync(venvPython) && current === expected);
}

function startServer(port) {
  const bindHost = LAN_ENABLED ? '0.0.0.0' : '127.0.0.1';
  const python = runtimePythonPath || resolvePythonExecutable();
  const args = [
    '-m',
    'uvicorn',
    'app.factory:create_app',
    '--factory',
    '--host',
    bindHost,
    '--port',
    String(port),
  ];
  serverProcess = spawn(python, args, {
    cwd: PROJECT_ROOT,
    env: pythonProcessEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  serverProcess.stderr?.on('data', (buf) => {
    const line = buf.toString().trim();
    if (line) {
      lastServerStderr = line;
      console.error('[server]', line);
    }
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
  initLogging();

  if (app.isPackaged) {
    userPrecisionDataDir = path.join(app.getPath('userData'), 'precision-data');
    fs.mkdirSync(path.join(userPrecisionDataDir, 'sessions'), { recursive: true });
    if (packagedRuntimeNeedsBootstrap()) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Elite Training',
        message: 'Preparing desktop runtime (first launch).',
        detail:
          'We are installing required app dependencies in a private runtime. ' +
          'This can take a few minutes and requires internet access.\n\n' +
          (logFilePath ? `Logs: ${logFilePath}` : ''),
      });
    }
    try {
      runtimePythonPath = ensurePackagedRuntimePython();
    } catch (e) {
      const python = resolvePythonExecutable();
      await dialog.showMessageBox({
        type: 'error',
        title: 'Elite Training',
        message: 'Could not prepare desktop runtime dependencies.',
        detail:
          `Tried Python: ${python}\n` +
          'The installer auto-creates a private runtime on first launch, but this step failed.\n\n' +
          String(e && e.message ? e.message : e) +
          (logFilePath ? `\n\nLogs: ${logFilePath}` : ''),
      });
      app.quit();
      return;
    }
  }

  const pkg = readDesktopPackageJson();
  app.setAboutPanelOptions({
    applicationName: 'Elite Training',
    applicationVersion: pkg.version || 'unknown',
    copyright: 'Elite Training',
  });

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
        (lastServerStderr ? `Last server error: ${lastServerStderr}\n` : '') +
        'Use a venv with dependencies installed (pip install -r requirements.txt), or set ELITE_TRAINING_PORT if the port is busy.' +
        (logFilePath ? `\n\nLogs: ${logFilePath}` : ''),
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

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});
