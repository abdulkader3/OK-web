const sharp = require('sharp');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const input = path.join(rootDir, 'assets/images/icon.png');
const publicDir = path.join(rootDir, 'public');

async function generateIcons() {
  await sharp(input).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  await sharp(input).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  await sharp(input).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');
}

generateIcons();
