/**
 * Rasterize static/favicon.png (shared 9-ball brand icon) to electron/icon.png for Electron / Windows.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const iconSourcePath = path.join(root, 'static', 'favicon.png');
const outPath = path.join(root, 'electron', 'icon.png');

async function main() {
  if (!fs.existsSync(iconSourcePath)) {
    console.error('Missing', iconSourcePath);
    process.exit(1);
  }
  await sharp(iconSourcePath).resize(512, 512).png().toFile(outPath);
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
