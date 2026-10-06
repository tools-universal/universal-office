// Confere o <p:timing> gerado a partir do PPT10 binário contra o do .pptx
// gêmeo: forma canônica (atributos ordenados, spid do gêmeo mapeado para o
// spid do .ppt pela ordem das formas no spTree) e diff linha a linha.
//
// Uso: node tools/ppt-lab/ppt-binary/run-ts.mjs tools/ppt-lab/ppt-binary/check-timing.ts [deck…] [--show N] [--slide K]
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { parseXml, childElements, firstChild, descend, type XmlElement } from '../../../packages/slides-core/src/xml.js';
import { convertPptToPptx } from '../../../packages/slides-core/src/ppt/index.js';

const lab = process.env['LAB_DIR']!;
const slidesRoot = join(lab, '..', '..', '..');
const argv = process.argv.slice(2);
const opt = (k: string): string | undefined => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const show = parseInt(opt('--show') ?? '12', 10);
const onlySlide = opt('--slide') ? parseInt(opt('--slide')!, 10) : undefined;
let decks = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
if (!decks.length) decks = readdirSync(join(slidesRoot, 'samples', 'playback')).filter((f) => f.endsWith('.ppt')).map((f) => f.slice(0, -4));

function slidesOf(zip: Uint8Array): XmlElement[] {
  const parts = unzipSync(zip);
  const out: XmlElement[] = [];
  for (let i = 1; parts[`ppt/slides/slide${i}.xml`]; i++) out.push(parseXml(strFromU8(parts[`ppt/slides/slide${i}.xml`]!)));
  return out;
}

/** ids das formas do spTree em ordem de documento (inclui filhos de grupos). */
function shapeIds(sld: XmlElement): string[] {
  const tree = descend(sld, 'p:spTree');
  const out: string[] = [];
  const walk = (el: XmlElement): void => {
    for (const c of childElements(el)) {
      if (['p:sp', 'p:pic', 'p:cxnSp', 'p:graphicFrame', 'p:grpSp'].includes(c.name)) {
        const id = descend(c, 'p:cNvPr')?.attrs['id'];
        if (id) out.push(id);
        if (c.name === 'p:grpSp') walk(c);
      }
    }
  };
  if (tree) walk(tree);
  return out;
}

function timingOf(sld: XmlElement): XmlElement | undefined {
  const t = firstChild(sld, 'p:timing');
  if (t) return t;
  for (const ac of childElements(sld, 'mc:AlternateContent')) {
    for (const br of childElements(ac)) { const x = firstChild(br, 'p:timing'); if (x) return x; }
  }
  return undefined;
}

const IGNORE = new Set(['id', 'xmlns:p14', 'xmlns:mc', 'dirty']);
function canon(el: XmlElement, map: Map<string, string>, depth = 0, out: string[] = []): string[] {
  const attrs = Object.entries(el.attrs).filter(([k]) => !IGNORE.has(k) && !k.startsWith('xmlns'))
    .map(([k, v]) => `${k}=${k === 'spid' ? (map.get(v) ?? `?${v}`) : v}`).sort().join(' ');
  out.push(`${'  '.repeat(depth)}${el.name}${attrs ? ' ' + attrs : ''}`);
  for (const c of el.children) {
    if (typeof c === 'string') { if (c.trim()) out.push(`${'  '.repeat(depth + 1)}"${c.trim()}"`); }
    else if (!c.name.startsWith('p14:') && c.name !== 'p:extLst') canon(c, map, depth + 1, out);
  }
  return out;
}

/** Diff simples (LCS) → linhas com - / +. */
function diff(a: string[], b: string[]): string[] {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const out: string[] = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { i++; j++; }
    else if (j < m && (i >= n || dp[i]![j + 1]! >= dp[i + 1]![j]!)) out.push(`+ ${b[j++]}`);
    else out.push(`- ${a[i++]}`);
  }
  return out;
}

let same = 0, total = 0;
for (const deck of decks) {
  const ppt = join(slidesRoot, 'samples', 'playback', `${deck}.ppt`);
  const twinPath = [join(slidesRoot, 'samples', 'playback', `${deck}.pptx`), join(slidesRoot, 'samples', `${deck}.pptx`)].find(existsSync);
  if (!twinPath) continue;
  const conv = slidesOf(convertPptToPptx(new Uint8Array(readFileSync(ppt))));
  const twin = slidesOf(new Uint8Array(readFileSync(twinPath)));
  conv.forEach((s, i) => {
    if (onlySlide !== undefined && onlySlide !== i + 1) return;
    const t = twin[i];
    if (!t) return;
    const ids = shapeIds(t), cids = shapeIds(s);
    const map = new Map<string, string>();
    ids.forEach((id, k) => { if (cids[k]) map.set(id, cids[k]!); });
    const a = timingOf(t), b = timingOf(s);
    if (!a && !b) return;
    total++;
    const ca = a ? canon(a, map) : [], cb = b ? canon(b, new Map(cids.map((x) => [x, x]))) : [];
    const d = diff(ca, cb);
    if (!d.length) { same++; return; }
    console.log(`== ${deck} #${i + 1}: ${d.length} linhas diferentes (- gêmeo / + nosso)`);
    for (const line of d.slice(0, show)) console.log('   ' + line);
  });
}
console.log(`timing: ${same}/${total} slides idênticos ao gêmeo (forma canônica)`);
