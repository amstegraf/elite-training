/**
 * Rasterize static/favicon.svg (9-ball) to electron/icon.png for Electron / Windows.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'static', 'favicon.svg');
const outPath = path.join(root, 'electron', 'icon.png');

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error('Missing', svgPath);
    process.exit(1);
  }
  await sharp(svgPath).resize(512, 512).png().toFile(outPath);
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
