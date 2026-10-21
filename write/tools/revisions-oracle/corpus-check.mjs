// Documentos REAIS do corpus (fora do repositório) com revisões:
//  1. a visão final (padrão) com o texto excluído no modelo tem de desenhar
//     exatamente o que desenhava quando o leitor o descartava (mesmas páginas e
//     glifos nas mesmas posições) — o motor esconde o excluído sem mexer em nada;
//  2. os quatro modos (final, simples, todas, original) diagramam sem exceção;
//  3. aceitar e rejeitar tudo e salvar: o .docx relê, sem revisões.
//   node write/tools/revisions-oracle/corpus-check.mjs [--limit N]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createNodeFontProvider } from '../corpus-lab/node-fonts.mjs';

const core = await import(new URL('../../packages/docx-core/dist/index.js', import.meta.url).href);
const eng = await import(new URL('../../packages/docx-layout/dist/index.js', import.meta.url).href);
const ROOT = process.env.CORPUS_ROOT ?? 'E:/UniversalWriteTest';
const limit = Number(process.argv[process.argv.indexOf('--limit') + 1] || Infinity);
const provider = await createNodeFontProvider({ missing: [] });

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '_lab') yield* walk(p); }
    else if (['.docx', '.doc'].includes(extname(e.name).toLowerCase())) yield p;
  }
}

/** Todos os parágrafos do documento (corpo, células, cabeçalhos/rodapés, notas, caixas). */
function allParas(full) {
  const out = [];
  const para = (p) => { out.push(p); for (const r of p.runs) { r.textbox?.paras?.forEach(para); if (r.textbox?.blocks) blocks(r.textbox.blocks); } };
  const blocks = (bs) => { for (const b of bs ?? []) { if (b.type === 'paragraph') para(b.paragraph); else for (const row of b.rows) for (const c of row.cells) { c.paragraphs.forEach(para); c.tables.forEach((t) => blocks([t])); } } };
  blocks(full.blocks);
  for (const s of full.sections) for (const set of [s.headerBlocks, s.footerBlocks]) for (const k of ['default', 'first', 'even']) blocks(set?.[k]);
  for (const m of [full.footnoteBlocks, full.endnoteBlocks]) for (const b of m?.values() ?? []) blocks(b);
  return out;
}

const glyphs = (res) => res.pages.map((p) => p.items.filter((it) => it.t === 'glyphs').map((it) => `${it.text}@${Math.round(it.y)}:${it.glyphs.map((g) => Math.round(g.x)).join(',')}`).join('|'));

let n = 0, withRev = 0, same = 0;
const problems = [];
for (const file of walk(join(ROOT, 'Documents'))) {
  if (withRev >= limit) break;
  let bytes = new Uint8Array(readFileSync(file));
  try {
    if (core.isWordBinary(bytes)) bytes = core.convertDocToDocx(bytes);
    else if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) continue;
    n++;
    const full = core.readFullDocument(core.DocxPackage.load(bytes));
    const paras = allParas(full);
    if (!paras.some((p) => core.paragraphHasRevisions(p))) continue;
    withRev++;
    const res = eng.layoutDocument(full, provider);
    // o mesmo documento sem o texto excluído (o leitor antigo)
    const old = core.readFullDocument(core.DocxPackage.load(bytes));
    for (const p of allParas(old)) p.runs = p.runs.filter((r) => !r.props.del);
    const resOld = eng.layoutDocument(old, provider);
    const a = glyphs(res), b = glyphs(resOld);
    if (a.length === b.length && a.every((x, i) => x === b[i])) same++;
    else problems.push(`${file}: visão final mudou (${b.length} → ${a.length} páginas)`);
    for (const mode of ['simple', 'all', 'original']) eng.layoutDocument(full, provider, { revisions: { mode } });
    for (const accept of [true, false]) {
      const pkg = core.DocxPackage.load(bytes);
      const f2 = core.readFullDocument(pkg, { sources: true });
      core.markSectionBreaks(f2);
      f2.sources.baseline();
      const body = f2.blocks.filter((x) => x.type === 'paragraph').map((x) => x.paragraph);
      (accept ? core.acceptRevisions : core.rejectRevisions)(body);
      const blocksNow = [];
      let bi = 0;
      for (const blk of f2.blocks) if (blk.type !== 'paragraph' || body.includes(blk.paragraph)) blocksNow.push(blk); else bi++;
      core.writeDocument(pkg, { paragraphs: body, sectPr: f2.sections[f2.sections.length - 1].sectPr }, [], { blocks: blocksNow, sources: f2.sources });
      const back = core.readFullDocument(core.DocxPackage.load(pkg.save()));
      const left = back.blocks.filter((x) => x.type === 'paragraph').map((x) => x.paragraph).filter((p) => core.paragraphHasRevisions(p)).length;
      if (left) problems.push(`${file}: ${accept ? 'aceitar' : 'rejeitar'} tudo deixou ${left} parágrafo(s) com revisão no corpo`);
    }
  } catch (e) {
    problems.push(`${file}: ERRO ${String(e?.stack ?? e).split('\n').slice(0, 2).join(' | ')}`);
  }
}
console.log(`${n} documentos; ${withRev} com revisões; visão final idêntica em ${same}/${withRev}`);
for (const p of problems) console.log(`✗ ${p}`);
