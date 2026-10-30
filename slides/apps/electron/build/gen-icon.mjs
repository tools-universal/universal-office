// Rasteriza build/icon.svg → build/icon.png (1024×1024). O electron-builder usa
// esse PNG para gerar os ícones por plataforma (.ico no Windows, .icns no macOS,
// .png no Linux). Rodado no CI antes do `electron-builder` (ver release-desktop.yml).
//
// Gera também os ícones dos tipos de arquivo associados (fileAssociations no
// package.json): build/file-<ext>.ico (PNG dentro do ICO, Vista+) e
// build/file-<ext>.icns — uma folha com o slide (tela com "play") na cor do formato. Sem texto no
// SVG: não depende das fontes da máquina do CI.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const SIZE = 1024;

await sharp(join(dir, 'icon.svg'), { density: 384 })
  .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(dir, 'icon.png'));

console.log(`wrote build/icon.png (${SIZE}x${SIZE})`);

// 512px: o maior ícone que o Flathub aceita (vai no tar.gz do Linux, em
// share/flatpak/, de onde o manifesto do Flatpak o instala)
await sharp(join(dir, 'icon.png')).resize(512, 512).png().toFile(join(dir, 'icon-512.png'));
console.log('wrote build/icon-512.png (512x512)');

// ── ícones de documento ──
const DOC_TYPES = {
  pptx: '#E5532D', // PowerPoint
  ppt: '#B23A1E',  // PowerPoint 97-2003 (mais escuro)
};
const docSvg = (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <path d="M60 16h96l52 52v164a8 8 0 0 1-8 8H60a8 8 0 0 1-8-8V24a8 8 0 0 1 8-8z" fill="#fff" stroke="#8a8f98" stroke-width="6"/>
  <path d="M156 16v44a8 8 0 0 0 8 8h44" fill="#e8eaee" stroke="#8a8f98" stroke-width="6" stroke-linejoin="round"/>
  <g stroke="#c4c8cf" stroke-width="8" stroke-linecap="round"><path d="M84 92h56M84 116h96"/></g>
  <rect x="28" y="136" width="136" height="96" rx="14" fill="${color}"/>
  <rect x="54" y="156" width="84" height="56" rx="6" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/>
  <path d="M88 170l26 14-26 14z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

const png = (svg, size) => sharp(Buffer.from(svg), { density: Math.max(72, (72 * size) / 256) * 1.5 })
  .resize(size, size).png().toBuffer();

function ico(images) { // [{ size, data }]
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e);
    head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4);   // planos
    head.writeUInt16LE(32, e + 6);  // bpp
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((im) => im.data)]);
}

const ICNS_TYPES = { 16: 'icp4', 32: 'icp5', 64: 'icp6', 128: 'ic07', 256: 'ic08', 512: 'ic09', 1024: 'ic10' };
function icns(images) {
  const chunks = images.map(({ size, data }) => {
    const h = Buffer.alloc(8);
    h.write(ICNS_TYPES[size], 0, 'ascii');
    h.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([h, data]);
  });
  const h = Buffer.alloc(8);
  h.write('icns', 0, 'ascii');
  h.writeUInt32BE(8 + chunks.reduce((n, c) => n + c.length, 0), 4);
  return Buffer.concat([h, ...chunks]);
}

for (const [ext, color] of Object.entries(DOC_TYPES)) {
  const svg = docSvg(color);
  const icoImgs = await Promise.all([16, 24, 32, 48, 64, 128, 256].map(async (size) => ({ size, data: await png(svg, size) })));
  const icnsImgs = await Promise.all([16, 32, 64, 128, 256, 512, 1024].map(async (size) => ({ size, data: await png(svg, size) })));
  writeFileSync(join(dir, `file-${ext}.ico`), ico(icoImgs));
  writeFileSync(join(dir, `file-${ext}.icns`), icns(icnsImgs));
  writeFileSync(join(dir, `file-${ext}.png`), icnsImgs.find((i) => i.size === 256).data);
  console.log(`wrote build/file-${ext}.{ico,icns,png}`);
}
