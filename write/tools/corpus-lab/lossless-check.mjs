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
//      campos/notas/sdt/equações/desenhos não podem cair;
//   3. estilos: modifica o estilo do 1º parágrafo editado (tamanho) e cria um
//      vinculado (par Char) aplicado a outro → o styles.xml relê, os outros
//      w:style saem byte a byte e o novo estilo chega ao parágrafo.
// --tables: também edita a 1ª tabela do corpo como o editor (linha nova com
// texto e campo de fórmula, mescla, sombreamento, largura preferida, estilo de
// tabela novo) e põe bordas de página → só ela e o sectPr do corpo mudam.
// --out grava os editados como <n>.docx + manifest.tsv (para abrir no Word:
// word-open-check.ps1).
// Relatório: LAB_DIR/report/lossless.json.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
const { DocxPackage, readFullDocument, markSectionBreaks, writeDocument, insertText, applyRunProps, splitParagraph, parseXml, childElements, firstChild,
  readStyleIndex, styleRaw, putStyle, patchStyleXml, patchStyleRPr, styleKid, newStyleXml, styleIdFromName } = core;

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
// --sections: além das edições de texto, quebra de seção + colunas + quebra de coluna + paisagem
const sectionsMode = args.includes('--sections');
const tablesMode = args.includes('--tables');

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

/** Salva como o editor depois de mexer nas seções: a geometria e as refs do corpo vêm do modelo. */
function saveModel(pkg, full, model) {
  const hfParts = [];
  const seen = new Set();
  for (const s of full.sections) {
    for (const [kind, refs, set, blocks] of [['header', s.headerRefs, s.headers, s.headerBlocks], ['footer', s.footerRefs, s.footers, s.footerBlocks]]) {
      for (const r of refs) {
        if (seen.has(r.path) || !set[r.type]) continue;
        seen.add(r.path);
        hfParts.push({ kind, type: r.type, rid: r.rid, path: r.path, paragraphs: set[r.type], blocks: blocks?.[r.type], dirty: false });
      }
    }
  }
  writeDocument(pkg, { paragraphs: model.paragraphs, sectPr: model.sectPr }, hfParts, {
    comments: full.comments.length ? full.comments : undefined,
    bodySectRefs: [...model.bodyRefs.headerRefs, ...model.bodyRefs.footerRefs],
    blocks: full.blocks,
    sources: full.sources,
  });
  return pkg.save();
}

const text = (p) => p.runs.map((r) => r.text).join('');
const COUNT = ['<w:hyperlink', '<w:bookmarkStart', 'fldCharType="begin"', '<w:fldSimple', '<w:footnoteReference', '<w:endnoteReference',
  '<w:sdt>', '<m:oMath', '<w:drawing', '<w:pict', 'commentRangeStart', '<w:tbl>',
  // controle de alterações: as revisões não podem sumir ao salvar
  '<w:ins ', '<w:del ', '<w:moveFrom ', '<w:moveTo ', '<w:rPrChange', '<w:pPrChange'];
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
    // --sections: quebra de seção contínua no meio de um 4º parágrafo, a seção nova
    // com duas colunas e linha, quebra de coluna num 5º e a última em paisagem (as
    // regras do Word em section-ops; o salvar é o do editor: refs do corpo do modelo)
    let secEdits = 0;
    if (sectionsMode) {
      const last = b.full.sections[b.full.sections.length - 1];
      model.sectPr = last.sectPr;
      model.bodyRefs = { headerRefs: last.headerRefs.map((r) => ({ kind: 'header', type: r.type, rid: r.rid })), footerRefs: last.footerRefs.map((r) => ({ kind: 'footer', type: r.type, rid: r.rid })) };
    }
    if (sectionsMode && cands[3]) {
      const p = cands[3][0];
      const pi = ps.indexOf(p);
      const range = core.sectionRanges(model)[core.sectionIndexAt(model, pi)];
      const raw = b.full.sources.sectPrRaw(range.sb ? ps[range.end] : undefined);
      core.insertSectionBreak(model, { para: pi, offset: 9 }, 'continuous', raw ? { raw } : {});
      const bi = b.full.blocks.findIndex((x) => x.type === 'paragraph' && x.paragraph === p);
      b.full.blocks.splice(bi + 1, 0, { type: 'paragraph', paragraph: ps[pi + 1] });
      const sp = core.sectionSectPr(model, core.sectionIndexAt(model, pi + 1));
      sp.cols = core.columnsFor(sp, { count: 2, sep: true });
      edited.push(p);
      // a metade nova, o parágrafo que encerra a seção (refs e tipo) e o sectPr do corpo (paisagem)
      secEdits += 3;
      if (cands[4]) {
        const q = cands[4][0];
        const qi = ps.indexOf(q);
        insertText(model, { para: qi, offset: 4 }, '\u000B');
        edited.push(q);
      }
      core.setOrientation(model.sectPr, 'landscape');
    }
    // 3. estilos
    const stylesPath = 'word/styles.xml';
    const sx0 = b.pkg.getPartText(stylesPath);
    let styleEdit = null;
    // (--sections usa o 4º e o 5º candidatos: os estilos vão no 6º)
    const sc = sectionsMode ? cands[5] : cands[3];
    if (sx0 && sc) {
      const idx = readStyleIndex(sx0);
      const dPara = idx.styles.find((x) => x.type === 'paragraph' && x.isDefault)?.id;
      const dChar = idx.styles.find((x) => x.type === 'character' && x.isDefault)?.id;
      const target = cands[0]?.[0].props.styleId && idx.styles.some((x) => x.id === cands[0][0].props.styleId) ? cands[0][0].props.styleId : dPara;
      let sx = sx0;
      const raw = target ? styleRaw(sx, target) : undefined;
      if (raw) sx = putStyle(sx, target, patchStyleXml(raw, { rPr: patchStyleRPr(styleKid(raw, 'w:rPr'), { szHalfPt: 26 }) }));
      const taken = new Set(idx.styles.map((x) => x.id));
      const id = styleIdFromName('Estilo Lossless', taken); taken.add(id);
      const tw = styleIdFromName(id + 'Char', taken);
      const rPr = patchStyleRPr(undefined, { bold: true, color: 'C00000' });
      sx = putStyle(sx, id, newStyleXml({ type: 'paragraph', custom: true, id, name: 'Estilo Lossless', basedOn: dPara, link: tw, qFormat: true, rPr }));
      sx = putStyle(sx, tw, newStyleXml({ type: 'character', custom: true, id: tw, name: 'Estilo Lossless Char', basedOn: dChar, link: id, rPr }));
      b.pkg.setPartText(stylesPath, sx);
      sc[0].props.styleId = id;
      edited.push(sc[0]);
      styleEdit = { target: raw ? target : null, id, tw, ids: idx.styles.map((x) => x.id) };
    }
    // --tables: a 1ª tabela do corpo com 2+ linhas e 2+ colunas
    let tblEdit = null;
    if (tablesMode) {
      const t = b.full.blocks.find((x) => x.type === 'table' && x.rows.length >= 2 && x.gridColsTwips.length >= 2);
      if (t) {
        const T = core.tableOps;
        const nCols = T.mapTable(t).nCols;
        const nr = T.insertRows(t, { r1: 0, c1: 0, r2: 0, c2: 0 }, 'below', 1);
        // (a linha nova continua as mesclas verticais de cima: o texto vai na 1ª célula visível)
        const vis = T.mapTable(t).rows[nr.r1].filter((x) => x.cell.tcPr?.vMerge !== 'continue');
        const g = vis[0] ?? T.cellAt(T.mapTable(t), nr.r1, 0);
        const para = g.cell.paragraphs[0];
        const rp = para.runs[0]?.props ?? para.props.runProps ?? {};
        para.runs = [{ text: 'XYZ ', props: { ...rp } }, { text: '0', props: { ...rp }, field: '=SUM(ABOVE) \\# "0,00"' }];
        if (vis[1] && vis[1].col === g.col + g.span) {
          const both = { r1: nr.r1, c1: g.col, r2: nr.r1, c2: vis[1].col };
          if (T.canMerge(t, both)) T.mergeCells(t, both);
        }
        T.setShading(t, { r1: 0, c1: 0, r2: 0, c2: nCols - 1 }, { val: 'clear', color: 'auto', fill: 'FFF2CC' });
        T.setPreferredWidth(t, { type: 'pct', w: 5000 }, 9000);
        const sx1 = b.pkg.getPartText(stylesPath);
        let tsId = null;
        if (sx1) {
          const taken = new Set(readStyleIndex(sx1).styles.map((x) => x.id));
          tsId = styleIdFromName('Tabela Lossless', taken);
          let raw = core.newTableStyleXml({ id: tsId, name: 'Tabela Lossless' });
          raw = core.patchTableStyleXml(raw, 'wholeTable', { borders: { top: { val: 'single', sz: 4, color: '4472C4' }, bottom: { val: 'single', sz: 4, color: '4472C4' }, insideH: { val: 'single', sz: 4, color: '4472C4' } } });
          raw = core.patchTableStyleXml(raw, 'firstRow', { bold: true, fill: 'D9E2F3' });
          b.pkg.setPartText(stylesPath, putStyle(sx1, tsId, raw));
          T.setTableProps(t, { tblStyle: tsId });
        }
        const last = b.full.sections[b.full.sections.length - 1];
        const side = { val: 'double', sz: 4, space: 24, color: 'auto' };
        last.sectPr.pgBorders = { offsetFrom: 'page', top: side, left: side, bottom: side, right: side };
        tblEdit = { tsId };
      }
    }
    const out = sectionsMode ? saveModel(b.pkg, b.full, model) : save(b.pkg, b.full, false);
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
    // (--tables: a tabela e o sectPr do corpo)
    const allowed = edited.length + (cands[2] ? 1 : 0) + secEdits + (tblEdit ? 2 : 0);
    if (changed > allowed) res.issues.push(`changed:${changed}>${allowed}`);
    if (!xml.includes('XYZ') && cands[0]) res.issues.push('missing-edit');
    if (tblEdit) {
      if (!/<w:instrText[^>]*>\s*=SUM\(ABOVE\)/.test(xml)) res.issues.push('tables-no-formula');
      if (!xml.includes('<w:pgBorders')) res.issues.push('tables-no-pgborders');
      if (!xml.includes('w:fill="FFF2CC"')) res.issues.push('tables-no-shading');
      if (tblEdit.tsId && !xml.includes(`<w:tblStyle w:val="${tblEdit.tsId}"/>`)) res.issues.push('tables-style-not-applied');
      if (tblEdit.tsId && !re.getPartText(stylesPath)?.includes(`w:styleId="${tblEdit.tsId}"`)) res.issues.push('tables-style-missing');
      res.tables = true;
    }
    if (styleEdit) {
      const sa = orig.getPartText(stylesPath), sb = re.getPartText(stylesPath);
      const map = (x) => new Map(readStyleIndex(x).styles.map((s) => [s.id, x.slice(s.start, s.end)]));
      const ma = map(sa), mb = map(sb);
      const moved = styleEdit.ids.filter((i) => i !== styleEdit.target && ma.get(i) !== mb.get(i));
      if (tblEdit?.tsId && !mb.get(tblEdit.tsId)) res.issues.push('tables-style-unread');
      if (moved.length) res.issues.push(`styles-changed:${moved.slice(0, 3).join(',')}`);
      if (!mb.get(styleEdit.id) || !mb.get(styleEdit.tw)) res.issues.push('styles-missing-new');
      if (!xml.includes(`<w:pStyle w:val="${styleEdit.id}"/>`)) res.issues.push('styles-not-applied');
      if (!readFullDocument(re).formatting.styles.styles[styleEdit.id]) res.issues.push('styles-unread');
      res.styles = true;
    }
    // (--sections: só os que receberam a quebra de seção — o word-open-check confere uma seção a mais)
    if (outDir && (cands[0] || tblEdit) && (!sectionsMode || secEdits > 0) && (!tablesMode || tblEdit)) { mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, `${n}.docx`), out); res.out = `${n}.docx`; }
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
