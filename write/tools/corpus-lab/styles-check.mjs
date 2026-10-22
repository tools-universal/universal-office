// Confere os ESTILOS do <universal-write> num Chromium headless (sem janelas):
// documento novo com os estilos do Word, aplicar parágrafo/caractere/vinculado,
// Enter com próximo estilo, criar a partir da seleção, modificar, renomear,
// atualizar para corresponder, Inspetor, excluir, desfazer e o styles.xml
// SALVO (como o Word grava — valores do oráculo write/tools/styles-oracle).
// Grava os .docx em --out (padrão: <lab>/estilos/check) + manifest.tsv para o
// word-open-check.ps1.
//
// Uso: node tools/corpus-lab/styles-check.mjs [--out pasta]
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, createReadStream } from 'node:fs';
import { join, dirname, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const writeRoot = join(here, '..', '..');
const repoRoot = join(writeRoot, '..');
const require = createRequire(join(repoRoot, 'slides', 'package.json'));
const { chromium } = require('playwright');
const { unzipSync, strFromU8 } = require(join(writeRoot, 'node_modules', 'fflate'));
const { resolveFonts, listFontFamilies } = require(join(repoRoot, 'shared', 'fonts', 'node', 'system-fonts.cjs'));

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const outDir = opt('out', join(process.env.LAB_DIR ?? 'E:/UniversalWriteTest/_lab', 'estilos', 'check'));
mkdirSync(outDir, { recursive: true });

// bundle próprio (pasta temporária por processo: sessões paralelas não se pisam)
const buildDir = join(tmpdir(), `uw-styles-check-${process.pid}`);
mkdirSync(buildDir, { recursive: true });
const ed = join(writeRoot, 'packages');
await build({
  entryPoints: [join(here, 'edit-harness.ts')],
  bundle: true, format: 'esm', logLevel: 'warning', sourcemap: 'inline',
  outfile: join(buildDir, 'harness.bundle.js'),
  alias: {
    '@universal-office/docx-core': join(ed, 'docx-core', 'src', 'index.ts'),
    '@universal-office/docx-layout': join(ed, 'docx-layout', 'src', 'index.ts'),
    '@universal-office/fonts': join(repoRoot, 'shared', 'fonts', 'src', 'index.ts'),
    '@universal-office/drawingml': join(repoRoot, 'shared', 'drawingml', 'src', 'index.ts'),
    '@universal-office/ui': join(repoRoot, 'shared', 'ui', 'src', 'index.ts'),
    '@universal-office/collation': join(repoRoot, 'sheet', 'packages', 'calc', 'src', 'collation.ts'),
    '@universal-office/compare': join(ed, 'compare', 'src', 'index.ts'),
  },
});
writeFileSync(join(buildDir, 'harness.html'),
  '<!doctype html><meta charset="utf-8"><body style="margin:0"></body><script type="module" src="/__lab/harness.bundle.js"></script>');

const fontBlobs = new Map();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (body, type = 'application/octet-stream') => { res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
  try {
    if (url.pathname.startsWith('/__lab/')) return send(readFileSync(join(buildDir, url.pathname.slice(7))), MIME[extname(url.pathname)]);
    if (url.pathname.startsWith('/__font/')) {
      const b = fontBlobs.get(url.pathname.slice(8));
      if (!b) { res.writeHead(404).end(); return; }
      return send(b, 'font/ttf');
    }
    const path = normalize(join(repoRoot, decodeURIComponent(url.pathname)));
    if (!path.startsWith(repoRoot) || !existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    createReadStream(path).pipe(res);
  } catch (e) { res.writeHead(500).end(String(e)); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
let nextFont = 0;
async function resolveRefs(families) {
  const out = [];
  for (const fam of families) {
    for (const { bytes, ...f } of await resolveFonts([fam])) {
      const id = String(nextFont++);
      fontBlobs.set(id, Buffer.from(bytes));
      out.push({ ...f, family: String(fam), url: `/__font/${id}` });
    }
  }
  return out;
}

const browser = await chromium.launch({ headless: true, args: ['--disable-gpu-sandbox'] });
const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1300, height: 1000 }, locale: 'en-US' });
await context.exposeFunction('__labListFonts', () => listFontFamilies());
await context.exposeFunction('__labResolveFonts', (families) => resolveRefs(families));
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
await page.goto(`${base}/__lab/harness.html`);
await page.waitForFunction(() => !!window.ed);

const ev = (fn, ...args) => page.evaluate(({ fn, args }) => window.ed[fn](...args), { fn, args });
const call = (name, ...args) => page.evaluate(({ name, args }) => window.ed.call(name, ...args), { name, args });
const results = [];
function check(name, ok, info) {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 400) : ''}`);
}
const partsOf = (b64) => {
  const z = unzipSync(Buffer.from(b64, 'base64'));
  return { styles: z['word/styles.xml'] ? strFromU8(z['word/styles.xml']) : '', doc: strFromU8(z['word/document.xml']), z };
};
const styleXml = (xml, id) => xml.match(new RegExp(`<w:style [^>]*w:styleId="${id}"[^>]*>[\\s\\S]*?</w:style>`))?.[0];
const manifest = [];
const saveAs = async (name) => {
  const b64 = await ev('saveBase64');
  writeFileSync(join(outDir, name), Buffer.from(b64, 'base64'));
  manifest.push(`${name}\t${join(outDir, name)}`);
  return b64;
};

// ───────────── A. documento novo ─────────────
await ev('blank');
let g = await call('listStyles', 'gallery');
check('documento novo: galeria do Word, na ordem (en)', JSON.stringify(g.map((s) => s.name)) === JSON.stringify(['Normal', 'No Spacing', 'Heading 1', 'Title', 'Subtitle',
  'Subtle Emphasis', 'Emphasis', 'Intense Emphasis', 'Strong', 'Quote', 'Intense Quote', 'Subtle Reference', 'Intense Reference', 'Book Title', 'List Paragraph']), g.map((s) => s.name));
await page.evaluate(() => document.querySelector('universal-write').setAttribute('lang', 'pt'));
g = await call('listStyles', 'gallery');
check('nomes em pt (lang no elemento)', g[2]?.name === 'Título 1' && g[1]?.name === 'Sem Espaçamento', g.map((s) => s.name));
const look = await call('styleFormatting', 'Ttulo1');
check('Título 1 efetivo: Aptos Display 20 pt, antes 18 pt/depois 4 pt', look?.fontFamily === 'Aptos Display' && look.sizePt === 20 && look.spaceBeforeTwips === 360 && look.spaceAfterTwips === 80, look);

await call('pasteText', 'Relatório anual XYZ');
await call('applyStyle', 'Ttulo1');
let ps = await ev('paras');
check('aplicar Título 1', ps[0].style === 'Ttulo1', ps[0]);
await ev('select', 0, ps[0].text.length);
await call('pressEnter');
ps = await ev('paras');
check('Enter no fim do Título 1 → próximo estilo (Normal)', ps.length === 2 && ps[1].style === undefined, ps);
g = await call('listStyles', 'gallery');
check('Título 1 em uso → Título 2 aparece na galeria', g.some((s) => s.rawName === 'heading 2'), g.map((s) => s.name));

await call('pasteText', 'Texto do corpo com uma palavra forte.');
await ev('select', 1, 33);
await call('applyStyle', 'Forte');
ps = await ev('paras');
check('estilo de caractere no cursor → a palavra inteira', ps[1].runs.some((r) => r.text === 'forte' && r.charStyle === 'Forte'), ps[1].runs);
await ev('select', 0, 10, 0, 15);
await call('applyStyle', 'Citao');
ps = await ev('paras');
check('vinculado em parte do parágrafo → par Char', ps[0].style === 'Ttulo1' && ps[0].runs.some((r) => r.text === 'anual' && r.charStyle === 'CitaoChar'), ps[0].runs);

// criar a partir da seleção (formatação direta → estilo)
await ev('select', 1, ps[1].text.length);
await call('pressEnter');
await call('pasteText', 'Parágrafo destacado');
await ev('select', 2, 0, 2, 19);
await call('toggleRunProp', 'bold');
await call('setColor', 'C00000');
await call('setAlignment', 'center');
const id = await call('createStyle', { name: 'Destaque' });
ps = await ev('paras');
check('criar estilo: id como o Word e aplicado ao parágrafo', id === 'Destaque' && ps[2].style === 'Destaque', { id, p: ps[2] });
check('criar estilo: a formatação direta uniforme saiu do parágrafo', !ps[2].runs.some((r) => r.bold || r.color) && ps[2].props.alignment === undefined, ps[2]);
let saved = partsOf(await ev('saveBase64'));
check('styles.xml: vinculado com par Char, na galeria',
  styleXml(saved.styles, 'Destaque') === '<w:style w:type="paragraph" w:customStyle="1" w:styleId="Destaque"><w:name w:val="Destaque"/><w:basedOn w:val="Normal"/><w:link w:val="DestaqueChar"/><w:qFormat/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:color w:val="C00000"/></w:rPr></w:style>'
  && styleXml(saved.styles, 'DestaqueChar') === '<w:style w:type="character" w:customStyle="1" w:styleId="DestaqueChar"><w:name w:val="Destaque Char"/><w:basedOn w:val="Fontepargpadro"/><w:link w:val="Destaque"/><w:rPr><w:b/><w:color w:val="C00000"/></w:rPr></w:style>',
  [styleXml(saved.styles, 'Destaque'), styleXml(saved.styles, 'DestaqueChar')]);
check('styles.xml: latente usado entrou com a definição do Word (Forte, Citação Char)', !!styleXml(saved.styles, 'Forte') && !!styleXml(saved.styles, 'CitaoChar'));

await call('modifyStyle', 'Destaque', { format: { szHalfPt: 32, spaceAfterTwips: 240 } });
saved = partsOf(await ev('saveBase64'));
check('modificar: rPr/pPr do estilo e do par', /<w:sz w:val="32"\/>/.test(styleXml(saved.styles, 'Destaque') ?? '') && /<w:sz w:val="32"\/>/.test(styleXml(saved.styles, 'DestaqueChar') ?? '')
  && /<w:spacing w:after="240"\/>/.test(styleXml(saved.styles, 'Destaque') ?? ''), styleXml(saved.styles, 'Destaque'));

check('renomear: nome e id mudam, o documento acompanha', await call('renameStyle', 'Destaque', 'Destaque Azul'));
ps = await ev('paras');
saved = partsOf(await ev('saveBase64'));
check('… pStyle e par renomeados', ps[2].style === 'DestaqueAzul' && !!styleXml(saved.styles, 'DestaqueAzulChar') && !styleXml(saved.styles, 'Destaque'), { s: ps[2].style });

// atualizar o Normal para corresponder à seleção (direito à direita) + desfazer
await ev('select', 1, 2);
await call('setAlignment', 'right');
await call('updateStyleFromSelection');
ps = await ev('paras');
saved = partsOf(await ev('saveBase64'));
check('atualizar para corresponder: Normal ganha jc=right, o parágrafo perde o direto',
  /<w:jc w:val="right"\/>/.test(styleXml(saved.styles, 'Normal') ?? '') && ps[1].props.alignment === undefined, { n: styleXml(saved.styles, 'Normal'), a: ps[1].props.alignment });
await call('undo');
ps = await ev('paras');
saved = partsOf(await ev('saveBase64'));
check('desfazer volta a folha de estilos e o parágrafo', !/<w:jc/.test(styleXml(saved.styles, 'Normal') ?? '') && ps[1].props.alignment === 'right', { n: styleXml(saved.styles, 'Normal'), a: ps[1].props.alignment });

// Inspetor
await ev('select', 1, 33);
let insp = await call('inspectStyle');
check('inspetor: parágrafo Normal + alinhamento direto; texto Forte', insp.paragraph.name === 'Normal' && insp.paragraph.direct.alignment === 'right' && insp.text.id === 'Forte', insp);
await call('clearParagraphFormatting');
await call('clearCharacterStyle');
insp = await call('inspectStyle');
ps = await ev('paras');
check('limpar formatação de parágrafo e estilo de caractere', insp.paragraph.direct.alignment === undefined && !ps[1].runs.some((r) => r.charStyle), insp);

check('excluir estilo personalizado', await call('deleteStyle', 'DestaqueAzul'));
ps = await ev('paras');
saved = partsOf(await ev('saveBase64'));
check('… parágrafos voltam ao Normal e os dois w:style saem', ps[2].style === undefined && !styleXml(saved.styles, 'DestaqueAzul') && !styleXml(saved.styles, 'DestaqueAzulChar'), ps[2]);
check('built-in não se exclui', !(await call('deleteStyle', 'Ttulo1')));
await call('createStyle', { name: 'Ação & Reação', type: 'character' });
saved = partsOf(await saveAs('novo.docx'));
check('nome com acento/&: id como o Word (AoReao)', !!styleXml(saved.styles, 'AoReao'));
const re = await ev('openBase64', Buffer.from(readFileSync(join(outDir, 'novo.docx'))).toString('base64'));
ps = await ev('paras');
check('reabrir o salvo: estilos e textos', re.engine && ps[0].style === 'Ttulo1' && ps[0].runs.some((r) => r.charStyle === 'CitaoChar'), ps.map((p) => p.style));

// ───────────── B. documento existente: só o estilo mexido muda ─────────────
const demo = readFileSync(join(writeRoot, 'samples', 'demo.docx'));
const orig = partsOf(demo.toString('base64'));
await ev('openBase64', demo.toString('base64'));
await call('modifyStyle', 'Normal', { format: { szHalfPt: 26 } });
const after = partsOf(await saveAs('demo-normal-13.docx'));
const ids = [...orig.styles.matchAll(/w:styleId="([^"]*)"/g)].map((m) => m[1]);
const changed = ids.filter((i) => styleXml(orig.styles, i) !== styleXml(after.styles, i));
check('existente: só o w:style modificado muda (o resto byte a byte)', changed.length === 1 && changed[0] === 'Normal' && (styleXml(after.styles, 'Normal') ?? '').includes('<w:sz w:val="26"/>')
  && orig.styles.replace(styleXml(orig.styles, 'Normal'), '') === after.styles.replace(styleXml(after.styles, 'Normal'), ''), changed);
check('existente: document.xml não muda (nenhum parágrafo tocado)', orig.doc === after.doc);
// texto marcador para o word-open-check
await ev('select', 0, 0);
await call('pasteText', 'XYZ ');
await call('applyStyle', 'Ttulo2');
ps = await ev('paras');
const t2 = partsOf(await saveAs('demo-titulo2.docx'));
check('built-in pelo id pt-BR num documento em inglês usa o estilo que já existe (Heading2)', ps[0].style === 'Heading2'
  && t2.styles.split('<w:name w:val="heading 2"/>').length === 2, { s: ps[0].style });

writeFileSync(join(outDir, 'manifest.tsv'), manifest.join('\n') + '\n');
await browser.close();
server.close();
if (errors.length) console.log('erros da página:', errors.slice(0, 5));
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações OK${bad.length ? ' — falhas: ' + bad.map((r) => r.name).join('; ') : ''}`);
console.log(`docx em ${outDir} (manifest.tsv para o word-open-check.ps1)`);
process.exit(bad.length || errors.length ? 1 : 0);
