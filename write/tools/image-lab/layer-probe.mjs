// Sonda: o Word aceita o ORIGINAL da camada a14:imgLayer em PNG (em vez de HD
// Photo .wdp)? Monta, a partir do .docx do experimento pe-saturation, variantes
// com a camada trocada por outra imagem (o círculo de alpha.png) e pede ao Word
// (COM, pela trava) para abrir, mudar a saturação e salvar. Se a imagem nova sair
// do círculo, o Word usou a camada.
//   node tools/image-lab/layer-probe.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { acquireWordLock, releaseWordLock } from '../../../tools/parallel/word-lock.mjs';
import { alphaPng } from './test-image.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '.out', 'layer');
mkdirSync(out, { recursive: true });
const src = unzipSync(readFileSync(join(here, '.out', 'pe-saturation.docx')));
const circle = alphaPng();

function variant(name, f) {
  const parts = { ...src };
  f(parts);
  writeFileSync(join(out, `${name}.docx`), zipSync(parts));
}
// a) camada .wdp original (controle)
variant('wdp', () => {});
// b) camada PNG com o tipo de relação hdphoto
variant('png-hdphoto', (p) => {
  delete p['word/media/hdphoto1.wdp'];
  p['word/media/hdphoto1.png'] = circle;
  const rels = strFromU8(p['word/_rels/document.xml.rels']).replace('media/hdphoto1.wdp', 'media/hdphoto1.png');
  p['word/_rels/document.xml.rels'] = strToU8(rels);
});
// c) camada PNG com o tipo de relação image
variant('png-image', (p) => {
  delete p['word/media/hdphoto1.wdp'];
  p['word/media/hdphoto1.png'] = circle;
  const rels = strFromU8(p['word/_rels/document.xml.rels'])
    .replace('http://schemas.microsoft.com/office/2007/relationships/hdphoto" Target="media/hdphoto1.wdp', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/hdphoto1.png');
  p['word/_rels/document.xml.rels'] = strToU8(rels);
});

acquireWordLock('image-lab layer');
try {
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'layer-probe.ps1'), '-Dir', out], { stdio: 'inherit', windowsHide: true });
} finally { releaseWordLock(); }

for (const n of ['wdp', 'png-hdphoto', 'png-image']) {
  try {
    const p = unzipSync(readFileSync(join(out, `${n}-out.docx`)));
    const media = Object.keys(p).filter((k) => k.startsWith('word/media/')).map((k) => `${k}:${p[k].length}`);
    const doc = strFromU8(p['word/document.xml']);
    const blip = /<a:blip\b[\s\S]*?<\/a:blip>/.exec(doc)?.[0] ?? '';
    console.log(n, media.join(' '), blip.replace(/<a:ext uri="\{28A0[\s\S]*?<\/a:ext>/, ''));
    for (const k of Object.keys(p).filter((k) => k.startsWith('word/media/image'))) writeFileSync(join(out, `${n}-${k.split('/').pop()}`), p[k]);
  } catch (e) { console.log(n, 'sem saída', e.message); }
}
