/**
 * Windows: electron-builder must replace dist-desktop/win-unpacked/resources/app.asar.
 * If Elite Training.exe from a previous unpack/install is still running, that file stays
 * locked and the build fails. Stop the packaged app before packaging.
 */
const { spawnSync } = require('child_process');

if (process.platform !== 'win32') {
  process.exit(0);
}

const r = spawnSync(
  'taskkill',
  ['/F', '/IM', 'Elite Training.exe', '/T'],
  { stdio: 'ignore', windowsHide: true },
);
// 0 = killed, 128 = "process not found" — both fine
if (r.status !== 0 && r.status !== 128) {
  /* ignore — user may not have taskkill in weird env */
}
spawnSync('powershell', ['-NoProfile', '-Command', 'Start-Sleep -Milliseconds 400'], {
  stdio: 'ignore',
  windowsHide: true,
});

process.exit(0);
