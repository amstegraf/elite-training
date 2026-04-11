/**
 * Elite Training desktop shell: starts the local FastAPI server, then opens it in a window.
 */
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
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
    const { dialog } = require('electron');
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
