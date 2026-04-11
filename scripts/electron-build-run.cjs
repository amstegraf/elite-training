/**
 * Run electron-builder with an output directory outside the repo on Windows so
 * editors (e.g. Cursor) that lock folders open in the workspace do not block
 * deletion of resources/app.asar during rebuilds.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const root = path.join(__dirname, '..');

function outputDir() {
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA;
    if (local) return path.join(local, 'EliteTraining', 'desktop-dist');
  }
  return path.join(root, 'dist-desktop');
}

const outDir = outputDir();
fs.mkdirSync(outDir, { recursive: true });

if (process.platform === 'win32') {
  console.log('[build:desktop] Output directory (outside repo):', outDir);
} else {
  console.log('[build:desktop] Output directory:', outDir);
}

const r = spawnSync(
  'npx',
  [
    'electron-builder',
    '--win',
    '--publish',
    'never',
    `-c.directories.output=${outDir}`,
  ],
  {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  },
);

process.exit(r.status === null ? 1 : r.status);
