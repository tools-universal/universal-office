// Compara a máscara de alfa de cada efeito do PDF do Word (exportada por
// fx-compare.py) com a do nosso motor (@universal-office/drawingml), no mesmo
// quadro e resolução: erro médio e máximo (0..1) por experimento.
//
//   python tools/image-lab/fx-compare.py <nomes…> && node tools/image-lab/fx-compare.mjs <nomes…>
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', '..', 'package.json'));
const { PNG } = require('pngjs');
const dml = await import(pathToFileURL(join(here, '..', '..', '..', 'shared', 'drawingml', 'dist', 'index.js')).href);
const core = await import(pathToFileURL(join(here, '..', '..', 'packages', 'docx-core', 'dist', 'index.js')).href);

for (const name of process.argv.slice(2)) {
  const jf = join(here, '.out', 'fx', `${name}.json`);
  if (!existsSync(jf)) { console.log(name, 'sem exportação'); continue; }
  const info = JSON.parse(readFileSync(jf, 'utf8'));
  const xml = readFileSync(join(here, 'results', `${name}.xml`), 'utf8').replace(/\n\s*/g, '');
  const f = core.readPictureFormat(/<w:drawing>[\s\S]*?<\/w:drawing>/.exec(xml)[0]);
  const fx = f.effects;
  for (const L of info.layers) {
    const png = PNG.sync.read(readFileSync(L.png));
    const [w, h] = L.px;
    const word = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) word[i] = png.data[i * 4] / 255;
    const ppt = w / (L.box[2] - L.box[0]);
    // caixa da forma no quadro da camada (px): a imagem do PDF (ou, sem ela, a camada)
    const pic = info.pic ?? L.box;
    const box = { x: (pic[0] - L.box[0]) * ppt, y: (pic[1] - L.box[1]) * ppt, w: (pic[2] - pic[0]) * ppt, h: (pic[3] - pic[1]) * ppt };
    const sil = dml.fillPolygons(dml.newMask(w, h), [[box.x, box.y, box.x + box.w, box.y, box.x + box.w, box.y + box.h, box.x, box.y + box.h]]);
    let ours, kind;
    const s = fx.shadow;
    if (s?.kind === 'outer') {
      kind = 'sombra';
      const m = dml.outerShadowMask(sil, box, { blurPt: (s.blurRad ?? 0) / 12700, distPt: (s.dist ?? 0) / 12700, dirDeg: (s.dir ?? 0) / 60000, sx: (s.sx ?? 100000) / 100000, sy: (s.sy ?? 100000) / 100000, kxDeg: (s.kx ?? 0) / 60000, kyDeg: (s.ky ?? 0) / 60000, algn: s.algn }, ppt);
      const al = (s.color.mods?.find((x) => x[0] === 'alpha')?.[1] ?? 100000) / 100000;
      ours = m.a.map((v) => v * al);
    } else if (s?.kind === 'inner') {
      kind = 'interna';
      const m = dml.innerShadowMask(sil, { blurPt: (s.blurRad ?? 0) / 12700, distPt: (s.dist ?? 0) / 12700, dirDeg: (s.dir ?? 0) / 60000 }, ppt);
      const al = (s.color.mods?.find((x) => x[0] === 'alpha')?.[1] ?? 100000) / 100000;
      ours = m.a.map((v) => v * al);
    } else if (fx.glow) {
      kind = 'brilho';
      const m = dml.glowMask(sil, fx.glow.rad / 12700, ppt);
      const al = (fx.glow.color.mods?.find((x) => x[0] === 'alpha')?.[1] ?? 100000) / 100000;
      ours = m.a.map((v) => v * al);
    } else if (fx.softEdge) {
      kind = 'bordas';
      ours = dml.softEdgeMask(sil, fx.softEdge / 12700, ppt).a;
    } else { console.log(name, 'efeito não comparado'); continue; }
    let sum = 0, max = 0, at = 0;
    for (let i = 0; i < w * h; i++) {
      const e = Math.abs(ours[i] - word[i]);
      sum += e;
      if (e > max) { max = e; at = i; }
    }
    console.log(`${name} (${kind}, ${Math.round(ppt * 72)} ppp): erro médio ${(sum / (w * h)).toFixed(4)} máx ${max.toFixed(3)} em (${at % w},${Math.floor(at / w)}) word=${word[at].toFixed(3)} nosso=${ours[at].toFixed(3)}`);
  }
}
