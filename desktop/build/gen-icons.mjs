// Ícones da suíte a partir dos ícones REAIS dos apps (site/assets/icons/*.svg),
// rasterizados pelo Chromium do Electron (build/rasterize-icons.cjs: os SVG usam
// CSS — color-mix, currentColor —, que o librsvg não desenha), cada tamanho
// desenhado nativamente. Rodado antes do electron-builder (predist):
//
//   build/icon.png (1024) e build/icon-512.png — o ícone do app (universal-office.svg):
//       o electron-builder gera dele o .ico (Windows), o .icns (macOS) e os PNG do Linux.
//   build/editor-icons/<editor>.{ico,png} (+ office.*) — o ícone de cada editor
//       (write.svg, sheet.svg, slides.svg): janela e grupo na barra de tarefas
//       (setAppDetails), atalhos do instalador, Jump List, lançadores .desktop
//       do Linux/Flatpak e as janelas de boas-vindas.
//   build/file-<ext>.{ico,icns,png} — os tipos de arquivo associados
//       (fileAssociations): uma folha com o ícone do editor e a etiqueta na cor
//       do formato.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const SVG_DIR = join(dir, '..', '..', 'site', 'assets', 'icons');
const RASTER = join(dir, '.raster');
const out = join(dir, 'editor-icons');
mkdirSync(out, { recursive: true });

const ICONS = { office: 'universal-office.svg', write: 'write.svg', sheet: 'sheet.svg', slides: 'slides.svg' };
const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];
const FILE_ICO = [16, 24, 32, 48, 64, 128, 256];
const FILE_ICNS = [16, 32, 64, 128, 256, 512, 1024];
const DOC_TYPES = {
  docx: ['write', '#2E78F5'], // Word
  doc: ['write', '#1F4FA8'],  // Word 97-2003 (mais escuro)
  odt: ['write', '#1E8C7E'],  // OpenDocument
  xlsx: ['sheet', '#1E8C4E'], // Excel
  xlsm: ['sheet', '#2E6B45'], // Excel com macros
  xls: ['sheet', '#14532D'],  // Excel 97-2003
  pptx: ['slides', '#E5532D'], // PowerPoint
  ppt: ['slides', '#B23A1E'],  // PowerPoint 97-2003
};

const appIcon = (file) => `<img src="${file}" style="width:100%;height:100%;object-fit:contain;display:block">`;
// folha com a dobra, a etiqueta do formato no alto e o ícone do editor embaixo
const fileIcon = (file, color) => `
<svg viewBox="0 0 256 256" style="position:absolute;inset:0;width:100%;height:100%">
  <path d="M52 12h104l56 56v168a10 10 0 0 1-10 10H52a10 10 0 0 1-10-10V22a10 10 0 0 1 10-10z" fill="#fff" stroke="#8a8f98" stroke-width="6"/>
  <path d="M156 12v46a10 10 0 0 0 10 10h46" fill="#e8eaee" stroke="#8a8f98" stroke-width="6" stroke-linejoin="round"/>
  <rect x="70" y="40" width="64" height="20" rx="10" fill="${color}"/>
  <g stroke="#c4c8cf" stroke-width="8" stroke-linecap="round"><path d="M70 92h112M70 114h86"/></g>
</svg>
<img src="${file}" style="position:absolute;left:30%;top:46%;width:52%;height:52%;object-fit:contain">`;

const jobs = [];
const add = (name, size, html) => jobs.push({ name, size, html });
add('app-1024', 1024, appIcon(ICONS.office));
add('app-512', 512, appIcon(ICONS.office));
for (const [name, file] of Object.entries(ICONS)) {
  for (const size of [...ICO_SIZES, 512]) add(`${name}-${size}`, size, appIcon(file));
}
for (const [ext, [editor, color]] of Object.entries(DOC_TYPES)) {
  for (const size of new Set([...FILE_ICO, ...FILE_ICNS])) add(`file-${ext}-${size}`, size, fileIcon(ICONS[editor], color));
}

// ── Chromium ──
const require = createRequire(import.meta.url);
const electronPkg = dirname(require.resolve('electron/package.json'));
const electron = require('electron');
if (!existsSync(electron)) spawnSync(process.execPath, [join(electronPkg, 'install.js')], { stdio: 'inherit' });
rmSync(RASTER, { recursive: true, force: true });
mkdirSync(RASTER, { recursive: true });
const jobsFile = join(RASTER, 'jobs.json');
writeFileSync(jobsFile, JSON.stringify(jobs));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const linux = process.platform === 'linux' ? ['--ozone-platform=headless', '--no-sandbox'] : [];
const r = spawnSync(electron, [...linux, join(dir, 'rasterize-icons.cjs'), RASTER, SVG_DIR, jobsFile], { stdio: 'inherit', env, timeout: 300000 });
if (r.status !== 0) throw new Error(`rasterize-icons falhou (status ${r.status}, ${r.error?.message ?? ''})`);
const png = (name) => readFileSync(join(RASTER, `${name}.png`));

// ── ICO (PNG dentro do ICO, Vista+) e ICNS ──
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

writeFileSync(join(dir, 'icon.png'), png('app-1024'));
writeFileSync(join(dir, 'icon-512.png'), png('app-512'));
console.log('wrote build/icon.png (1024) and build/icon-512.png — universal-office.svg');
for (const [name, file] of Object.entries(ICONS)) {
  writeFileSync(join(out, `${name}.ico`), ico(ICO_SIZES.map((size) => ({ size, data: png(`${name}-${size}`) }))));
  writeFileSync(join(out, `${name}.png`), png(`${name}-512`));
  console.log(`wrote build/editor-icons/${name}.{ico,png} — ${file}`);
}
for (const ext of Object.keys(DOC_TYPES)) {
  writeFileSync(join(dir, `file-${ext}.ico`), ico(FILE_ICO.map((size) => ({ size, data: png(`file-${ext}-${size}`) }))));
  writeFileSync(join(dir, `file-${ext}.icns`), icns(FILE_ICNS.map((size) => ({ size, data: png(`file-${ext}-${size}`) }))));
  writeFileSync(join(dir, `file-${ext}.png`), png(`file-${ext}-256`));
}
console.log(`wrote build/file-{${Object.keys(DOC_TYPES).join(',')}}.{ico,icns,png}`);
rmSync(RASTER, { recursive: true, force: true });
