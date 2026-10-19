// Salvamento sem perdas sobre o corpus real (fora do git).
//
//   node tools/corpus-lab/lossless-check.mjs [--limit N] [--out dir] [--only trecho --show tag]
//
// Para cada .docx (contêiner zip) do corpus:
//   1. abre com a fonte original e salva SEM editar → todas as partes têm de
//      sair byte a byte;
//   2. edita (digita no meio de um parágrafo, negrito num trecho de outro,
//      Enter num terceiro) e salva → o XML tem de reler, só os filhos do
//      corpo editados podem mudar e as contagens de hyperlinks/indicadores/
//      campos/notas/sdt/equações/desenhos não podem cair.
// --out grava os editados como <n>.docx + manifest.tsv (para abrir no Word:
// word-open-check.ps1).
// Relatório: LAB_DIR/report/lossless.json.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
const { DocxPackage, readFullDocument, markSectionBreaks, writeDocument, insertText, applyRunProps, splitParagraph, parseXml, childElements, firstChild } = core;

const CORPUS_ROOT = process.env.CORPUS_ROOT ?? 'E:/UniversalWriteTest';
const LAB_DIR = process.env.LAB_DIR ?? join(CORPUS_ROOT, '_lab');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const limit = Number(opt('--limit') ?? Infinity);
const outDir = opt('--out');
// depuração: só os arquivos cujo caminho contém --only; --show <tag> imprime o
// filho do corpo onde a contagem da tag mudou (original × salvo)
const only = opt('--only');
const show = opt('--show');

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '_lab') yield* walk(p); }
    else if (['.docx', '.doc'].includes(extname(e.name).toLowerCase())) yield p;
  }
}

const isZip = (b) => b[0] === 0x50 && b[1] === 0x4b;

function open(bytes) {
  const pkg = DocxPackage.load(bytes);
  const full = readFullDocument(pkg, { sources: true });
  markSectionBreaks(full);
  full.sources.baseline();
  return { pkg, full };
}

const paras = (blocks) => blocks.filter((b) => b.type === 'paragraph').map((b) => b.paragraph);

function save(pkg, full, dirtyAllHf) {
  const last = full.sections[full.sections.length - 1];
  const hfParts = [];
  const seen = new Set();
  for (const s of full.sections) {
    for (const [kind, refs, set, blocks] of [['header', s.headerRefs, s.headers, s.headerBlocks], ['footer', s.footerRefs, s.footers, s.footerBlocks]]) {
      for (const r of refs) {
        if (seen.has(r.path) || !set[r.type]) continue;
        seen.add(r.path);
        hfParts.push({ kind, type: r.type, rid: r.rid, path: r.path, paragraphs: set[r.type], blocks: blocks?.[r.type], dirty: dirtyAllHf });
      }
    }
  }
  const lastRefs = [...last.headerRefs, ...last.footerRefs].map((r) => r.path);
  writeDocument(pkg, { paragraphs: paras(full.blocks), sectPr: last.sectPr }, hfParts, {
    comments: full.comments.length ? full.comments : undefined,
    bodySectRefs: hfParts.filter((h) => lastRefs.includes(h.path)).map((h) => ({ kind: h.kind, type: h.type, rid: h.rid })),
    blocks: full.blocks,
    sources: full.sources,
  });
  return pkg.save();
}

const text = (p) => p.runs.map((r) => r.text).join('');
const COUNT = ['<w:hyperlink', '<w:bookmarkStart', 'fldCharType="begin"', '<w:fldSimple', '<w:footnoteReference', '<w:endnoteReference',
  '<w:sdt>', '<m:oMath', '<w:drawing', '<w:pict', 'commentRangeStart', '<w:tbl>'];
const counts = (xml) => Object.fromEntries(COUNT.map((t) => [t, xml.split(t).length - 1]));

function bodyKids(xml) {
  const root = parseXml(xml, { positions: true });
  return childElements(firstChild(root, 'w:body')).map((k) => xml.slice(k.s, k.e));
}

function showDiff(a, b, tag) {
  const cnt = (x) => (x ?? '').split(tag).length - 1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i] || cnt(a[i]) === cnt(b[i])) continue;
    const A = a[i] ?? '', B = b[i] ?? '';
    let d = 0;
    while (d < A.length && A[d] === B[d]) d++;
    console.log(`#${i}: ${cnt(A)} → ${cnt(B)} (difere em ${d} de ${A.length})`);
    console.log('ORIG', A.slice(Math.max(0, d - 300), d + 1200));
    console.log('NOVO', B.slice(Math.max(0, d - 300), d + 1200));
    return;
  }
}

const results = [];
let n = 0;
const t0 = Date.now();
for (const file of walk(join(CORPUS_ROOT, 'Documents'))) {
  if (n >= limit) break;
  if (only && !file.includes(only)) continue;
  const bytes = new Uint8Array(readFileSync(file));
  if (!isZip(bytes)) continue;
  n++;
  const res = { file: file.slice(CORPUS_ROOT.length + 1), ok: true, issues: [] };
  try {
    // 1. sem editar
    const a = open(bytes);
    const orig = DocxPackage.load(bytes);
    const same = DocxPackage.load(save(a.pkg, a.full, true));
    for (const part of orig.partNames()) {
      if (same.getPartText(part) !== orig.getPartText(part)) res.issues.push(`unedited:${part}`);
    }
    // 2. editado
    const b = open(bytes);
    const ps = paras(b.full.blocks);
    const model = { paragraphs: ps, sectPr: b.full.sections[0].sectPr };
    const cands = ps.map((p, i) => [p, i]).filter(([p]) => text(p).length > 20 && p.runs.every((r) => !r.field && !r.noteRef && !r.custom));
    const edited = [];
    if (cands[0]) { insertText(model, { para: cands[0][1], offset: 5 }, 'XYZ'); edited.push(cands[0][0]); }
    if (cands[1]) { applyRunProps(model, { start: { para: cands[1][1], offset: 2 }, end: { para: cands[1][1], offset: 9 } }, { bold: true }); edited.push(cands[1][0]); }
    if (cands[2]) {
      const p = cands[2][0];
      splitParagraph(model, { para: ps.indexOf(p), offset: 7 });
      const tail = ps[ps.indexOf(p) + 1];
      const bi = b.full.blocks.findIndex((x) => x.type === 'paragraph' && x.paragraph === p);
      b.full.blocks.splice(bi + 1, 0, { type: 'paragraph', paragraph: tail });
      edited.push(p);
    }
    const out = save(b.pkg, b.full, false);
    const re = DocxPackage.load(out);
    const xml = re.documentXml();
    readFullDocument(re); // relê
    for (const part of re.partNames()) if (/^word\/[^/]+\.xml$|^word\/_rels\//.test(part)) parseXml(re.getPartText(part));
    const before = counts(orig.documentXml()), after = counts(xml);
    for (const t of COUNT) if (after[t] < before[t]) res.issues.push(`lost:${t}:${before[t]}→${after[t]}`);
    const ka = bodyKids(orig.documentXml()), kb = bodyKids(xml);
    if (show) showDiff(ka, kb, show);
    const changed = kb.filter((k) => !ka.includes(k)).length;
    res.edits = edited.length;
    res.changedKids = changed;
    if (changed > edited.length + (cands[2] ? 1 : 0)) res.issues.push(`changed:${changed}>${edited.length + 1}`);
    if (!xml.includes('XYZ') && cands[0]) res.issues.push('missing-edit');
    if (outDir && cands[0]) { mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, `${n}.docx`), out); res.out = `${n}.docx`; }
  } catch (e) {
    res.issues.push(`error:${String(e?.message ?? e).slice(0, 200)}`);
  }
  res.ok = res.issues.length === 0;
  results.push(res);
  if (!res.ok) console.log(`✗ ${res.file}: ${res.issues.slice(0, 4).join(' | ')}`);
  if (n % 100 === 0) console.log(`… ${n} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
mkdirSync(join(LAB_DIR, 'report'), { recursive: true });
writeFileSync(join(LAB_DIR, 'report', 'lossless.json'), JSON.stringify(results, null, 1));
if (outDir) {
  writeFileSync(join(outDir, 'manifest.tsv'),
    results.filter((r) => r.out).map((r) => `${r.out}\t${join(CORPUS_ROOT, r.file)}`).join('\n'), 'utf8');
}
const bad = results.filter((r) => !r.ok);
const kinds = {};
for (const r of bad) for (const i of r.issues) { const k = i.split(':').slice(0, 2).join(':'); kinds[k] = (kinds[k] ?? 0) + 1; }
console.log(`\n${results.length - bad.length}/${results.length} sem problemas; problemas por tipo:`, kinds);
