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
// --notes: nota de rodapé e de fim novas no 1º parágrafo editado (estilos e partes
// como o Word grava) e o texto da 1ª nota de rodapé existente editado → as outras
// notas saem cruas, as novas entram no fim das partes.
// --nav: régua e Painel de Navegação — recuos (esquerdo e deslocamento) num
// parágrafo, tabulações centralizada e decimal pontilhada noutro, tabulação
// padrão de 1 cm, margem esquerda da última seção e a seção de um título
// arrastada para antes da irmã anterior (os blocos mudam de lugar sem mudar o
// XML) → o XML relê e os títulos saem na ordem nova.
// --hf: cabeçalho e rodapé como o editor — Primeira Página Diferente trocada,
// distâncias, numeração i, ii… a partir de 3 na última seção; Pares e Ímpares;
// desvincula (cópia) e vincula (a parte sai) cabeçalhos de seções; número de
// página da galeria no rodapé da 1ª seção → as outras partes saem byte a byte.
// --refs: indicador novo num parágrafo, referência cruzada REF h a ele, legenda
// com SEQ num parágrafo novo e hiperlink com Dica de Tela → o XML relê, o
// indicador e os campos saem como o Word grava, nada se perde.
// --pictures: Formato da Imagem na 1ª imagem DrawingML do corpo (como o editor:
// XML cirúrgico + effectExtent) — giro, contorno, sombra, corte em elipse,
// transparência, texto alt e quebra/posição → só o parágrafo dela muda, o
// desenho relê com tudo e os outros desenhos saem crus.
// --out grava os editados como <n>.docx + manifest.tsv (para abrir no Word:
// word-open-check.ps1).
// Relatório: LAB_DIR/report/lossless.json.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
const { DocxPackage, readFullDocument, markSectionBreaks, writeDocument, insertText, applyRunProps, splitParagraph, parseXml, childElements, firstChild,
  readStyleIndex, styleRaw, putStyle, patchStyleXml, patchStyleRPr, styleKid, newStyleXml, styleIdFromName,
  noteRefIds, newNoteParagraphs, noteRefRun, ensureNoteParts, NOTE_STYLES } = core;

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
const notesMode = args.includes('--notes');
const refsMode = args.includes('--refs');

/** Notas como o editor passa ao salvar: o conteúdo das referenciadas no corpo. */
function notesOf(full) {
  const out = {};
  for (const kind of ['footnote', 'endnote']) {
    const used = noteRefIds(full.blocks, kind);
    const src = (kind === 'footnote' ? full.footnoteBlocks : full.endnoteBlocks) ?? new Map();
    out[kind] = { used, blocks: new Map(used.filter((id) => src.has(id)).map((id) => [id, src.get(id)])) };
  }
  return out;
}

/** Estilos de nota do documento pelo nome, ou os do Word pt-BR (como o editor). */
function noteStyles(pkg, kind) {
  let xml = pkg.getPartText('word/styles.xml');
  if (!xml) return {};
  const st = NOTE_STYLES[kind];
  const idx = () => readStyleIndex(xml);
  const named = (n) => idx().styles.find((x) => x.name.toLowerCase() === n.toLowerCase())?.id;
  const dP = idx().styles.find((x) => x.type === 'paragraph' && x.isDefault)?.id ?? 'Normal';
  const dC = idx().styles.find((x) => x.type === 'character' && x.isDefault)?.id ?? 'Fontepargpadro';
  const map = (x) => x.replace('<w:basedOn w:val="Normal"/>', () => `<w:basedOn w:val="${dP}"/>`).replace('<w:basedOn w:val="Fontepargpadro"/>', () => `<w:basedOn w:val="${dC}"/>`);
  let text = named(st.text.name), ref = named(st.ref.name);
  if (!text) { text = st.text.id; xml = putStyle(xml, text, map(st.text.xml)); if (!named(st.char.name)) xml = putStyle(xml, st.char.id, map(st.char.xml)); }
  if (!ref) { ref = st.ref.id; xml = putStyle(xml, ref, map(st.ref.xml)); }
  pkg.setPartText('word/styles.xml', xml);
  return { text, ref };
}

/** Cada w:footnote / w:endnote cru por id. */
const noteRaws = (xml, tag) => new Map([...(xml ?? '').matchAll(new RegExp(`<w:${tag}\\b[^>]*?w:id="(-?\\d+)"[\\s\\S]*?</w:${tag}>`, 'g'))].map((m) => [m[1], m[0]]));
const navMode = args.includes('--nav');
// --hf: cabeçalho e rodapé (ver editHf)
const hfMode = args.includes('--hf');
const picturesMode = args.includes('--pictures');
const layout = navMode ? await import(new URL('../../packages/docx-layout/dist/index.js', import.meta.url).href) : null;

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
    notes: notesOf(full),
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
    notes: notesOf(full),
  });
  return pkg.save();
}

// ── --hf: cabeçalho e rodapé como o editor (regras do Word em write/tools/hf-lab) ──

/** headerN.xml / rIdN livres (como o editor e o Word). */
function freeHfTarget(pkg, parts, kind) {
  const used = new Set([...pkg.partNames(), ...[...parts.values()].map((p) => p.path)]);
  let n = 1;
  while (used.has(`word/${kind}${n}.xml`)) n++;
  const rels = pkg.getPartText('word/_rels/document.xml.rels') ?? '';
  const rids = new Set([...rels.matchAll(/\bId="([^"]+)"/g)].map((m) => m[1]).concat([...parts.keys()]));
  let m = 1;
  while (rids.has(`rId${m}`)) m++;
  return { rid: `rId${m}`, path: `word/${kind}${n}.xml` };
}

const HF_FIELD = '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE   \\* MERGEFORMAT </w:instrText></w:r>'
  + '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:noProof/></w:rPr><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
/** número de página da galeria Fim da Página (estrutura do Word: sdt docPartObj) */
const HF_TEMPLATE = '<w:sdt><w:sdtPr><w:id w:val="123456789"/><w:docPartObj><w:docPartGallery w:val="Page Numbers (Bottom of Page)"/><w:docPartUnique/></w:docPartObj></w:sdtPr>'
  + `<w:sdtContent><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t xml:space="preserve">Pagina </w:t></w:r>${HF_FIELD}</w:p><w:p/></w:sdtContent></w:sdt>`;

/** Edita como o editor: última seção com Primeira Página Diferente trocada, distâncias
 *  2 cm / 1,5 cm e numeração i, ii… a partir de 3; Pares e Ímpares no documento;
 *  desvincula o cabeçalho padrão da 1ª seção k>0 que o herda (cópia da parte);
 *  vincula o da 1ª seção k>0 que tem o próprio (a parte sai do pacote); número de
 *  página da galeria no rodapé padrão da 1ª seção (troca o conteúdo da parte). */
function editHf(b, model) {
  const { pkg, full } = b;
  const store = full.sources;
  const last = full.sections[full.sections.length - 1];
  model.sectPr = last.sectPr;
  model.bodyRefs = { headerRefs: last.headerRefs.map((r) => ({ kind: 'header', type: r.type, rid: r.rid })), footerRefs: last.footerRefs.map((r) => ({ kind: 'footer', type: r.type, rid: r.rid })) };
  const ranges = core.sectionRanges(model);
  const holder = (k) => core.sectionRefs(model, k);
  const parts = new Map();
  for (const s of full.sections) {
    for (const [kind, refs, set, blocks] of [['header', s.headerRefs, s.headers, s.headerBlocks], ['footer', s.footerRefs, s.footers, s.footerBlocks]]) {
      for (const r of refs) if (!parts.has(r.rid)) parts.set(r.rid, { kind, path: r.path, paragraphs: set[r.type], blocks: blocks?.[r.type], dirty: false });
    }
  }
  const ed = { secEdits: 1, parts, titlePg: false, unlink: null, relink: null, tpl: null };
  const sp = model.sectPr;
  if (sp.titlePg) delete sp.titlePg; else sp.titlePg = true;
  ed.titlePg = !!sp.titlePg;
  sp.headerDistanceTwips = 1134;
  sp.footerDistanceTwips = 850;
  sp.pgNumFmt = 'lowerRoman';
  sp.pgNumStart = 3;
  core.writeEvenAndOddHeaders(pkg, true);
  const ptext = (ps) => (ps ?? []).map(text).join('\n');
  for (let k = 1; k < ranges.length; k++) {
    const own = holder(k).headerRefs.some((r) => r.type === 'default');
    if (!own && !ed.unlink) {
      let src = null;
      for (let s = k - 1; s >= 0 && !src; s--) src = holder(s).headerRefs.find((r) => r.type === 'default') ?? null;
      const sp0 = src && parts.get(src.rid);
      if (!sp0?.paragraphs || !pkg.getPart(sp0.path)) continue;
      const target = freeHfTarget(pkg, parts, 'header');
      const rels = pkg.getPartText(`word/_rels/${sp0.path.split('/').pop()}.rels`);
      if (rels) pkg.setPartText(`word/_rels/${target.path.split('/').pop()}.rels`, rels);
      const xml = core.copyHfPartXml(pkg.getPartText(sp0.path), () => 1 + Math.floor(Math.random() * 0x7ffffffe));
      const read = core.readHeaderFooterPart(pkg, target.path, store, xml);
      store.baseline();
      parts.set(target.rid, { kind: 'header', path: target.path, paragraphs: read.paras, blocks: read.blocks, dirty: false });
      holder(k).headerRefs.push({ kind: 'header', type: 'default', rid: target.rid });
      ed.unlink = { sec: k, path: target.path, text: ptext(read.paras) };
      if (k < ranges.length - 1) ed.secEdits += 1;
    } else if (own && !ed.relink && k !== ed.unlink?.sec) {
      const list = holder(k).headerRefs;
      const [r] = list.splice(list.findIndex((x) => x.type === 'default'), 1);
      ed.relink = { sec: k, rid: r.rid, path: parts.get(r.rid)?.path };
      if (k < ranges.length - 1) ed.secEdits += 1;
    }
  }
  const fr = holder(0).footerRefs.find((r) => r.type === 'default');
  const fp = fr && parts.get(fr.rid);
  if (fp?.paragraphs) {
    const read = core.readHeaderFooterPart(pkg, fp.path, store, core.hfPartXml('footer', HF_TEMPLATE));
    store.baseline();
    Object.assign(fp, { paragraphs: read.paras, blocks: read.blocks, dirty: true });
    ed.tpl = { path: fp.path };
  } else {
    const target = freeHfTarget(pkg, parts, 'footer');
    const read = core.readHeaderFooterPart(pkg, target.path, store, core.hfPartXml('footer', HF_TEMPLATE));
    store.baseline();
    parts.set(target.rid, { kind: 'footer', path: target.path, paragraphs: read.paras, blocks: read.blocks, dirty: false });
    holder(0).footerRefs.push({ kind: 'footer', type: 'default', rid: target.rid });
    ed.tpl = { path: target.path };
    if (ranges.length > 1) ed.secEdits += 1;
  }
  return ed;
}

/** Salva como o editor: as partes que as refs do MODELO usam; a vinculada sai. */
function saveHf(pkg, full, model, ed) {
  const hfParts = [];
  const seen = new Set();
  const holders = core.sectionRanges(model).map((_, k) => core.sectionRefs(model, k));
  for (const h of holders) {
    for (const r of [...h.headerRefs, ...h.footerRefs]) {
      const p = ed.parts.get(r.rid);
      if (!p?.paragraphs || seen.has(p.path)) continue;
      seen.add(p.path);
      hfParts.push({ kind: p.kind, type: r.type, rid: r.rid, path: p.path, paragraphs: p.paragraphs, blocks: p.blocks, dirty: p.dirty });
    }
  }
  writeDocument(pkg, { paragraphs: model.paragraphs, sectPr: model.sectPr }, hfParts, {
    comments: full.comments.length ? full.comments : undefined,
    bodySectRefs: [...model.bodyRefs.headerRefs, ...model.bodyRefs.footerRefs],
    blocks: full.blocks,
    sources: full.sources,
    notes: notesOf(full),
  });
  if (ed.relink) {
    ed.relink.still = holders.some((h) => [...h.headerRefs, ...h.footerRefs].some((r) => r.rid === ed.relink.rid));
    if (!ed.relink.still) core.dropUnusedHfParts(pkg, new Set([ed.relink.rid]));
  }
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
    // --notes: nota de rodapé e de fim novas no 1º editado; texto da 1ª nota de rodapé
    // existente editado (o resto das notas tem de sair cru)
    let noteEdit = null;
    // (como o editor: nada de nota em controle de conteúdo de texto sem formatação)
    const nc = notesMode ? cands.find((c) => !b.full.sources.inPlainTextControl(c[0], c[0].runs)) : undefined;
    if (nc) {
      if (!edited.includes(nc[0])) edited.push(nc[0]);
      const pi = ps.indexOf(nc[0]);
      const editedFn = noteRefIds(b.full.blocks, 'footnote')[0];
      if (editedFn !== undefined) {
        const np = paras(b.full.footnoteBlocks?.get(editedFn) ?? []);
        const last = np[np.length - 1];
        if (last) insertText({ paragraphs: np, sectPr: model.sectPr }, { para: np.length - 1, offset: text(last).length }, ' NOTA EDITADA');
      }
      ensureNoteParts(b.pkg);
      const ids = {};
      let off = nc === cands[0] ? 8 : 5; // depois do "XYZ" do 1º
      for (const kind of ['footnote', 'endnote']) {
        const st = noteStyles(b.pkg, kind);
        const map = (kind === 'footnote' ? (b.full.footnoteBlocks ??= new Map()) : (b.full.endnoteBlocks ??= new Map()));
        const all = [...map.keys(), ...(kind === 'footnote' ? b.full.footnotes : b.full.endnotes).keys(), ...(b.full.noteSpecialIds?.[kind] ?? [])];
        const id = Math.max(0, ...all) + 1;
        ids[kind] = id;
        core.insertRun(model, { para: pi, offset: off }, noteRefRun(kind, id, st.ref));
        off += 1;
        const np = newNoteParagraphs(kind, st.text, st.ref);
        np[0].runs[1].text = kind === 'footnote' ? ' NOTA NOVA RODAPE' : ' NOTA NOVA FIM';
        map.set(id, np.map((paragraph) => ({ type: 'paragraph', paragraph })));
      }
      noteEdit = { editedFn, ids };
    }
    // 3. estilos
    const stylesPath = 'word/styles.xml';
    const sx0 = b.pkg.getPartText(stylesPath);
    let styleEdit = null;
    // (--sections usa o 4º e o 5º candidatos: os estilos vão no 6º)
    const sc = sectionsMode || navMode ? cands[5] : cands[3];
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
    // --nav: recuos, tabulações, tabulação padrão, margem e arrastar seção de título
    let navEdit = null;
    if (navMode && cands[3] && cands[4]) {
      const pi = cands[3][0], pt = cands[4][0];
      pi.props.indentLeftTwips = 1134;
      pi.props.indentFirstLineTwips = -567;
      pt.props.tabStops = [{ posTwips: 2835, align: 'center' }, { posTwips: 5669, align: 'decimal', leader: 'dot' }];
      edited.push(pi, pt);
      core.writeDefaultTabStop(b.pkg, 567);
      const last = b.full.sections[b.full.sections.length - 1];
      last.sectPr.marginLeftTwips += 283;
      secEdits += 1;
      // seção de título (sem quebra de seção dentro) para antes da irmã anterior
      // texto sem o número da lista (a numeração muda com a ordem nova)
      const plain = (h) => (h.number ? h.text.slice(h.number.length) : h.text).trim();
      const heads = layout.documentOutline(b.full);
      let move = null;
      for (let k = 1; k < heads.length && !move; k++) {
        const h = heads[k];
        const prevSib = [...heads.slice(0, k)].reverse().find((x) => x.level <= h.level);
        if (!prevSib || prevSib.level !== h.level) continue;
        const next = heads.slice(k + 1).find((x) => x.level <= h.level);
        const s0 = h.block, e0 = next ? next.block : b.full.blocks.length - 1;
        const span = b.full.blocks.slice(prevSib.block, e0);
        if (e0 <= s0 || span.some((x) => x.type === 'paragraph' && x.paragraph.props.sectionBreak)) continue;
        move = { s0, e0, t: prevSib.block, moved: plain(h), target: plain(prevSib) };
      }
      if (move) {
        const blk = b.full.blocks.splice(move.s0, move.e0 - move.s0);
        b.full.blocks.splice(move.t, 0, ...blk);
        model.paragraphs = paras(b.full.blocks);
        ps.splice(0, ps.length, ...model.paragraphs);
      }
      navEdit = { move };
    }
    // --refs: indicador novo (marcas nos runs do modelo do editor), referência
    // cruzada REF \h a ele, legenda com SEQ num parágrafo novo e hiperlink com
    // Dica de Tela (como o <universal-write> grava — oráculo refs-lab)
    let refEdit = null;
    // fora de controles de conteúdo de texto sem formatação (o editor recusa campo e
    // hiperlink ali — canInsertField; o Word acusa arquivo corrompido) e do 3º
    // candidato (dividido acima); índices pelo modelo atual
    const free = refsMode ? cands.filter((c, k) => k !== 2 && !b.full.sources.inPlainTextControl(c[0], c[0].runs)) : [];
    if (refsMode && free.length >= 3) {
      const [hc, lc, bc] = free;
      const bp = bc[0], bpi = ps.indexOf(bp);
      let maxId = -1;
      for (const pp of paras(b.full.blocks)) for (const r of pp.runs) if (r.bookmark && r.bookmark.id > maxId) maxId = r.bookmark.id;
      for (const m of orig.documentXml().matchAll(/<w:bookmarkStart\b[^>]*\bw:id="(\d+)"/g)) maxId = Math.max(maxId, +m[1]);
      const id = maxId + 1;
      const bmText = text(bp).slice(0, 5);
      const mark = (end) => ({ text: '', props: { ...core.DEFAULT_RUN_PROPS }, bookmark: { id, name: 'RefLossless', ...(end ? { end: true } : {}) } });
      bp.runs.splice(core.splitAt(bp, 5), 0, mark(true));
      bp.runs.splice(core.insertIndex(bp, 0), 0, mark(false));
      if (!edited.includes(bp)) edited.push(bp);
      // a referência depois do "XYZ" do 1º editado (ou no começo do parágrafo)
      const host = ps.indexOf(hc[0]);
      const rp = { ...core.DEFAULT_RUN_PROPS };
      core.insertRun(model, { para: host, offset: hc === cands[0] ? 8 : 0 }, { text: bmText, props: rp, field: ' REF RefLossless \\h ', fieldResult: [{ text: bmText, props: rp }] });
      if (!edited.includes(hc[0])) edited.push(hc[0]);
      // hiperlink com Dica de Tela num trecho de outro
      const lp = ps.indexOf(lc[0]);
      applyRunProps(model, { start: { para: lp, offset: 10 }, end: { para: lp, offset: 14 } }, { link: 'https://exemplo.com/lossless', linkTip: 'Dica Lossless', charStyle: 'Hyperlink' });
      if (!edited.includes(lc[0])) edited.push(lc[0]);
      // legenda num parágrafo novo antes do 4º candidato
      const capP = { runs: [{ text: 'Figura ', props: { ...rp } }, { text: '1', props: { ...rp }, field: ' SEQ Figura \\* ARABIC ', fieldResult: [{ text: '1', props: { ...rp, noProof: true } }] }, { text: ' - Lossless', props: { ...rp } }], props: {} };
      const bi = b.full.blocks.findIndex((x) => x.type === 'paragraph' && x.paragraph === bp);
      b.full.blocks.splice(bi, 0, { type: 'paragraph', paragraph: capP });
      ps.splice(bpi, 0, capP);
      secEdits += 1;
      refEdit = { id, bmText };
    }
    // --hf: cabeçalho e rodapé como o editor (frente Cabeçalho e rodapé)
    const hfEdit = hfMode ? editHf(b, model) : null;
    if (hfEdit) secEdits += hfEdit.secEdits;
    // --pictures: a 1ª imagem com XML DrawingML do corpo (fora dos parágrafos já editados)
    let picEdit = null;
    if (picturesMode) {
      const hit = ps.flatMap((p) => p.runs.filter((r) => r.image?.rawDrawingXml && r.image.format && !r.image.ole).map((r) => [p, r])).find(([p]) => !edited.includes(p));
      if (hit) {
        const [p, r] = hit;
        const img = r.image;
        const f = img.format;
        const black = { kind: 'prstClr', val: 'black', mods: [['alpha', 40000]] };
        const ch = {
          rot: 15 * 60000, geom: { prst: 'ellipse' },
          line: { w: 19050, fill: { kind: 'srgbClr', val: 'C00000' } },
          shadow: { kind: 'outer', blurRad: 50800, dist: 38100, dir: 2700000, algn: 'tl', rotWithShape: false, color: black },
          blipFx: { ...(({ a14: _a, ...x }) => x)(f.blip), alphaModFix: 70000 },
          descr: 'Imagem editada (lossless)',
          ...(f.inline ? { wrap: 'square', at: { x: 0, y: 0 }, newRelativeHeight: 251659264 } : { posH: { relativeFrom: 'margin', align: 'center' } }),
        };
        let x = core.patchPicture(img.rawDrawingXml, ch);
        const pf = core.readPictureFormat(x);
        if (pf) x = core.patchPicture(x, { effectExtent: { l: 19050, t: 19050, r: 57150, b: 57150 } });
        img.rawDrawingXml = x;
        img.edited = true;
        core.syncImageFromXml(img);
        edited.push(p);
        picEdit = { wasInline: f.inline };
      }
    }
    const out = hfEdit ? saveHf(b.pkg, b.full, model, hfEdit) : sectionsMode ? saveModel(b.pkg, b.full, model) : save(b.pkg, b.full, false);
    const re = DocxPackage.load(out);
    const xml = re.documentXml();
    readFullDocument(re); // relê
    for (const part of re.partNames()) {
      if (!/^word\/[^/]+\.xml$|^word\/_rels\//.test(part)) continue;
      try { parseXml(re.getPartText(part)); } catch (e) { throw new Error(`${part}: ${e?.message ?? e}`); }
    }
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
    if (navEdit) {
      const rf = readFullDocument(re);
      const rps = paras(rf.blocks);
      if (!rps.some((p) => p.props.indentLeftTwips === 1134 && p.props.indentFirstLineTwips === -567)) res.issues.push('nav-indent');
      if (!xml.includes('<w:tab w:val="center" w:pos="2835"/><w:tab w:val="decimal" w:leader="dot" w:pos="5669"/>')) res.issues.push('nav-tabs');
      if (rf.formatting?.settings.defaultTabStop !== 567) res.issues.push('nav-default-tab');
      if (navEdit.move) {
        const hs = layout.documentOutline(rf).map((h) => (h.number ? h.text.slice(h.number.length) : h.text).trim());
        const a = hs.indexOf(navEdit.move.moved), t = hs.indexOf(navEdit.move.target);
        if (a < 0 || t < 0 || a > t) res.issues.push('nav-move');
        res.navMove = true;
      }
      res.nav = true;
    }
    if (hfEdit) {
      if (!(re.getPartText('word/settings.xml') ?? '').includes('<w:evenAndOddHeaders/>')) res.issues.push('hf-evenodd');
      const rf = readFullDocument(re);
      const ls = rf.sections[rf.sections.length - 1].sectPr;
      if (!!ls.titlePg !== hfEdit.titlePg) res.issues.push('hf-titlepg');
      if (ls.pgNumFmt !== 'lowerRoman' || ls.pgNumStart !== 3) res.issues.push('hf-pgnum');
      if (ls.headerDistanceTwips !== 1134 || ls.footerDistanceTwips !== 850) res.issues.push('hf-dist');
      const pt = (ps) => (ps ?? []).map(text).join('\n');
      if (hfEdit.unlink) {
        const s = rf.sections[hfEdit.unlink.sec];
        if (!s?.headerRefs.some((r) => r.type === 'default' && r.path === hfEdit.unlink.path)) res.issues.push('hf-unlink-ref');
        else if (pt(s.headers.default) !== hfEdit.unlink.text) res.issues.push('hf-unlink-text');
      }
      if (hfEdit.relink) {
        if (rf.sections[hfEdit.relink.sec]?.headerRefs.some((r) => r.type === 'default' && r.path === hfEdit.relink.path)) res.issues.push('hf-relink-ref');
        if (!hfEdit.relink.still && hfEdit.relink.path && re.getPart(hfEdit.relink.path)) res.issues.push('hf-relink-part');
      }
      const tx = re.getPartText(hfEdit.tpl.path) ?? '';
      if (!tx.includes('Page Numbers (Bottom of Page)') || !/<w:instrText[^>]*> PAGE /.test(tx)) res.issues.push('hf-template');
      // as outras partes de cabeçalho/rodapé saem byte a byte
      for (const part of orig.partNames()) {
        if (!/^word\/(?:header|footer)\d*\.xml$/.test(part) || part === hfEdit.tpl.path || part === hfEdit.relink?.path) continue;
        if (re.getPart(part) && re.getPartText(part) !== orig.getPartText(part)) res.issues.push(`hf-part-changed:${part}`);
      }
      res.hf = { titlePg: hfEdit.titlePg, unlink: hfEdit.unlink?.sec ?? -1, relink: hfEdit.relink?.sec ?? -1 };
    }
    if (refEdit) {
      if (!xml.includes(`<w:bookmarkStart w:id="${refEdit.id}" w:name="RefLossless"/>`) || !xml.includes(`<w:bookmarkEnd w:id="${refEdit.id}"/>`)) res.issues.push('refs-no-bookmark');
      if (!xml.includes('<w:instrText xml:space="preserve"> REF RefLossless \\h </w:instrText>')) res.issues.push('refs-no-ref');
      if (!xml.includes('<w:fldSimple w:instr=" SEQ Figura \\* ARABIC ">')) res.issues.push('refs-no-seq');
      if (!/<w:hyperlink r:id="[^"]+" w:tooltip="Dica Lossless" w:history="1">/.test(xml)) res.issues.push('refs-no-tooltip');
      const rf = readFullDocument(re);
      if (!rf.bookmarks.has('RefLossless') || !rf.bookmarkEnds?.has('RefLossless')) res.issues.push('refs-unread-bookmark');
      res.refs = true;
    }
    if (picEdit) {
      // o desenho editado relê com o que foi pedido (e só ele mudou: a contagem de changed acima)
      const rf = readFullDocument(re);
      const pics = paras(rf.blocks).flatMap((p) => p.runs.filter((r) => r.image?.format?.docPr.descr === 'Imagem editada (lossless)').map((r) => r.image));
      const im = pics[0];
      if (!im) res.issues.push('pictures-unread');
      else {
        const g = im.format;
        if (g.rot !== 15 * 60000) res.issues.push('pictures-rot');
        if (g.geom !== 'ellipse') res.issues.push('pictures-geom');
        if (g.line?.w !== 19050) res.issues.push('pictures-line');
        if (g.effects.shadow?.kind !== 'outer') res.issues.push('pictures-shadow');
        if (g.blip.alphaModFix !== 70000) res.issues.push('pictures-alpha');
        if (picEdit.wasInline && g.inline) res.issues.push('pictures-wrap');
        if (!picEdit.wasInline && g.posH?.align !== 'center') res.issues.push('pictures-pos');
        if (!im.data?.length) res.issues.push('pictures-media');
      }
      res.pictures = true;
    }
    if (tblEdit) {
      if (!/<w:instrText[^>]*>\s*=SUM\(ABOVE\)/.test(xml)) res.issues.push('tables-no-formula');
      if (!xml.includes('<w:pgBorders')) res.issues.push('tables-no-pgborders');
      if (!xml.includes('w:fill="FFF2CC"')) res.issues.push('tables-no-shading');
      if (tblEdit.tsId && !xml.includes(`<w:tblStyle w:val="${tblEdit.tsId}"/>`)) res.issues.push('tables-style-not-applied');
      if (tblEdit.tsId && !re.getPartText(stylesPath)?.includes(`w:styleId="${tblEdit.tsId}"`)) res.issues.push('tables-style-missing');
      res.tables = true;
    }
    if (noteEdit) {
      // notas: as novas no fim, a editada com o texto, as outras cruas
      for (const [kind, tag] of [['footnote', 'footnote'], ['endnote', 'endnote']]) {
        const path = `word/${kind}s.xml`;
        const ra = noteRaws(orig.getPartText(path), tag), rb = noteRaws(re.getPartText(path), tag);
        const nid = String(noteEdit.ids[kind]);
        if (!rb.get(nid)?.includes(kind === 'footnote' ? 'NOTA NOVA RODAPE' : 'NOTA NOVA FIM')) res.issues.push(`notes-missing-new:${kind}`);
        if (!xml.includes(`<w:${kind}Reference w:id="${nid}"/>`)) res.issues.push(`notes-missing-ref:${kind}`);
        for (const [id, raw] of ra) {
          if (kind === 'footnote' && id === String(noteEdit.editedFn)) {
            if (!rb.get(id)?.includes('NOTA EDITADA')) res.issues.push('notes-missing-edit');
          } else if (rb.has(id) && rb.get(id) !== raw) res.issues.push(`notes-changed:${kind}:${id}`);
        }
      }
      const back = readFullDocument(re);
      if (!back.footnotes.has(noteEdit.ids.footnote) || !back.endnotes.has(noteEdit.ids.endnote)) res.issues.push('notes-unread');
      res.notes = true;
    }
    if (styleEdit) {
      const sa = orig.getPartText(stylesPath), sb = re.getPartText(stylesPath);
      const map = (x) => new Map(readStyleIndex(x).styles.map((s) => [s.id, x.slice(s.start, s.end)]));
      const ma = map(sa), mb = map(sb);
      // (os estilos de nota que o --notes acrescenta não existiam no original)
      const moved = styleEdit.ids.filter((i) => i !== styleEdit.target && ma.has(i) && ma.get(i) !== mb.get(i));
      if (tblEdit?.tsId && !mb.get(tblEdit.tsId)) res.issues.push('tables-style-unread');
      if (moved.length) res.issues.push(`styles-changed:${moved.slice(0, 3).join(',')}`);
      if (!mb.get(styleEdit.id) || !mb.get(styleEdit.tw)) res.issues.push('styles-missing-new');
      if (!xml.includes(`<w:pStyle w:val="${styleEdit.id}"/>`)) res.issues.push('styles-not-applied');
      if (!readFullDocument(re).formatting.styles.styles[styleEdit.id]) res.issues.push('styles-unread');
      res.styles = true;
    }
    // (--sections: só os que receberam a quebra de seção — o word-open-check confere uma seção a mais)
    if (outDir && (cands[0] || tblEdit) && (!sectionsMode || secEdits > 0) && (!tablesMode || tblEdit) && (!navMode || navEdit) && (!hfMode || hfEdit) && (!refsMode || refEdit) && (!picturesMode || picEdit)) {
      mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, `${n}.docx`), out); res.out = `${n}.docx`;
      // --nav: o título arrastado e o de antes do qual ele entrou (o word-open-check confere a ordem)
      if (navEdit?.move) res.navOrder = [navEdit.move.moved, navEdit.move.target].map((x) => x.replace(/[\t\r\n]/g, ' ').slice(0, 60));
      // --hf: Primeira Página Diferente esperada e as seções desvinculada/vinculada (word-open-check -Hf)
      if (res.hf) res.hfCols = [res.hf.titlePg ? 1 : 0, res.hf.unlink, res.hf.relink];
    }
  } catch (e) {
    res.issues.push(`error:${String(e?.message ?? e).slice(0, 200)}`);
    if (process.env.LOSSLESS_STACK) console.log(e?.stack);
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
    results.filter((r) => r.out).map((r) => `${r.out}\t${join(CORPUS_ROOT, r.file)}${r.navOrder ? `\t${r.navOrder.join('\t')}` : ''}${r.hfCols ? `\t${r.hfCols.join('\t')}` : ''}`).join('\n'), 'utf8');
}
const bad = results.filter((r) => !r.ok);
const kinds = {};
for (const r of bad) for (const i of r.issues) { const k = i.split(':').slice(0, 2).join(':'); kinds[k] = (kinds[k] ?? 0) + 1; }
console.log(`\n${results.length - bad.length}/${results.length} sem problemas; problemas por tipo:`, kinds);
