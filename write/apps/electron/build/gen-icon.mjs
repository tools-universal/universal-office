// Rasteriza build/icon.svg → build/icon.png (1024×1024). O electron-builder usa
// esse PNG para gerar os ícones por plataforma (.ico no Windows, .icns no macOS,
// .png no Linux). Rodado no CI antes do `electron-builder` (ver release.yml).
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const SIZE = 1024;

await sharp(join(dir, 'icon.svg'), { density: 384 })
  .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(dir, 'icon.png'));

console.log(`wrote build/icon.png (${SIZE}x${SIZE})`);
