import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DocxPackage, readFullDocument, writeDocument, markSectionBreaks, insertText, applyRunProps, applyParaProps, splitParagraph,
  parseXml, childElements, firstChild,
  type FullDocument, type Paragraph, type Block, type HfPartInfo,
} from '../src/index.js';

const SAMPLES = join(__dirname, '../../../samples');
const CATALOG = join(SAMPLES, 'Catalogo-Recursos-Word.docx');
const DEMO = join(SAMPLES, 'demo.docx');

/** Abre com a fonte original e instala como o editor (quebras de seção nos parágrafos). */
function open(file: string): { pkg: DocxPackage; full: FullDocument; original: Uint8Array } {
  const original = new Uint8Array(readFileSync(file));
  const pkg = DocxPackage.load(original);
  const full = readFullDocument(pkg, { sources: true });
  markSectionBreaks(full);
  full.sources!.baseline();
  return { pkg, full, original };
}

/** Grava como o editor: corpo em blocos, refs da última seção, cabeçalhos (sujos opcionais). */
function save(pkg: DocxPackage, full: FullDocument, dirtyHf: string[] = []): DocxPackage {
  const last = full.sections[full.sections.length - 1]!;
  const hfParts: HfPartInfo[] = [];
  const seen = new Set<string>();
  for (const s of full.sections) {
    for (const [kind, refs, set, blocks] of [
      ['header', s.headerRefs, s.headers, s.headerBlocks],
      ['footer', s.footerRefs, s.footers, s.footerBlocks],
    ] as const) {
      for (const r of refs) {
        if (seen.has(r.path) || !set[r.type]) continue;
        seen.add(r.path);
        hfParts.push({ kind, type: r.type, rid: r.rid, path: r.path, paragraphs: set[r.type]!, blocks: blocks?.[r.type], dirty: dirtyHf.includes(r.path) });
      }
    }
  }
  const lastRefs = [...last.headerRefs, ...last.footerRefs].map((r) => r.path);
  writeDocument(pkg, { paragraphs: paragraphsOf(full.blocks), sectPr: last.sectPr }, hfParts, {
    comments: full.comments.length ? full.comments : undefined,
    bodySectRefs: hfParts.filter((h) => lastRefs.includes(h.path)).map((h) => ({ kind: h.kind, type: h.type, rid: h.rid })),
    blocks: full.blocks,
    sources: full.sources,
  });
  return DocxPackage.load(pkg.save());
}

const paragraphsOf = (blocks: Block[]): Paragraph[] =>
  blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);

const text = (p: Paragraph): string => p.runs.map((r) => r.text).join('');

/** Filhos de topo do w:body, crus. */
function bodyKids(xml: string): string[] {
  const root = parseXml(xml, { positions: true });
  const body = firstChild(root, 'w:body')!;
  return childElements(body).map((k) => xml.slice(k.s, k.e));
}

describe('gravação sem perdas', () => {
  for (const file of [CATALOG, DEMO]) {
    const name = file.split(/[\\/]/).pop()!;
    if (!existsSync(file)) { it.skip(`${name} ausente`, () => {}); continue; }

    it(`${name}: salvar sem editar devolve TODAS as partes byte a byte`, () => {
      const { pkg, full, original } = open(file);
      const before = DocxPackage.load(original);
      const after = save(pkg, full, full.sections.flatMap((s) => [...s.headerRefs, ...s.footerRefs].map((r) => r.path)));
      for (const part of before.partNames()) {
        expect(after.getPartText(part), part).toBe(before.getPartText(part));
      }
    });

    it(`${name}: editar um parágrafo só muda aquele filho do corpo`, () => {
      const { pkg, full, original } = open(file);
      const paras = paragraphsOf(full.blocks);
      const target = paras.findIndex((p) => text(p).length > 20 && p.runs.every((r) => !r.field && !r.noteRef));
      const model = { paragraphs: paras, sectPr: full.sections[0]!.sectPr };
      insertText(model, { para: target, offset: 3 }, 'XYZ');
      const after = save(pkg, full);
      const a = bodyKids(DocxPackage.load(original).documentXml());
      const b = bodyKids(after.documentXml());
      expect(b.length).toBe(a.length);
      const diff = a.map((x, i) => (x === b[i] ? -1 : i)).filter((i) => i >= 0);
      expect(diff.length).toBe(1);
      expect(b[diff[0]!]).toContain('XYZ');
      // a abertura do parágrafo (paraId, rsids) e o pPr são os originais
      expect(b[diff[0]!]!.slice(0, 40)).toBe(a[diff[0]!]!.slice(0, 40));
      // relê
      const re = readFullDocument(after);
      expect(paragraphsOf(re.blocks).map(text).join('\n')).toContain('XYZ');
    });
  }

  it('catálogo: negrito numa palavra preserva o rPr original dos vizinhos e o resto do parágrafo', () => {
    if (!existsSync(CATALOG)) return;
    const { pkg, full, original } = open(CATALOG);
    const paras = paragraphsOf(full.blocks);
    const pi = paras.findIndex((p) => text(p).length > 30 && p.runs.length >= 1 && p.runs.every((r) => !r.field));
    const model = { paragraphs: paras, sectPr: full.sections[0]!.sectPr };
    applyRunProps(model, { start: { para: pi, offset: 2 }, end: { para: pi, offset: 8 } }, { bold: true });
    const after = save(pkg, full);
    const a = bodyKids(DocxPackage.load(original).documentXml());
    const b = bodyKids(after.documentXml());
    const i = a.findIndex((x, k) => x !== b[k]);
    expect(b[i]).toMatch(/<w:b\/>/);
    // o rPr original de cada run (sem o negrito) continua no parágrafo salvo
    const origRPr = [...a[i]!.matchAll(/<w:rPr>[\s\S]*?<\/w:rPr>/g)].map((m) => m[0]);
    for (const r of origRPr) expect(b[i]).toContain(r.replace('</w:rPr>', ''));
  });

  it('demo: hyperlinks, indicadores e campos de um parágrafo editado sobrevivem', () => {
    if (!existsSync(DEMO)) return;
    const { pkg, full, original } = open(DEMO);
    const paras = paragraphsOf(full.blocks);
    const pi = paras.findIndex((p) => p.runs.some((r) => r.props.link) && text(p).length > 5);
    expect(pi).toBeGreaterThanOrEqual(0);
    const p = paras[pi]!;
    const end = text(p).length;
    insertText({ paragraphs: paras, sectPr: full.sections[0]!.sectPr }, { para: pi, offset: end }, ' fim');
    const after = save(pkg, full);
    const a = bodyKids(DocxPackage.load(original).documentXml());
    const b = bodyKids(after.documentXml());
    const k = a.findIndex((x, j) => x !== b[j]);
    for (const tag of ['<w:hyperlink', '<w:bookmarkStart', 'fldCharType="begin"']) {
      expect((b[k]!.match(new RegExp(tag, 'g')) ?? []).length, tag).toBe((a[k]!.match(new RegExp(tag, 'g')) ?? []).length);
    }
    expect(b[k]).toContain(' fim');
  });

  it('catálogo: referência de nota num parágrafo editado continua w:footnoteReference', () => {
    if (!existsSync(CATALOG)) return;
    const { pkg, full } = open(CATALOG);
    const paras = paragraphsOf(full.blocks);
    const pi = paras.findIndex((p) => p.runs.some((r) => r.noteRef));
    const p = paras[pi]!;
    const ids = p.runs.filter((r) => r.noteRef).map((r) => r.noteRef!.id);
    // como o editor: o número da nota vira o texto do run
    for (const r of p.runs) if (r.noteRef && r.text === '') r.text = String(r.noteRef.id);
    insertText({ paragraphs: paras, sectPr: full.sections[0]!.sectPr }, { para: pi, offset: 0 }, 'Início ');
    const xml = save(pkg, full).documentXml();
    for (const id of ids) expect(xml).toContain(`<w:footnoteReference w:id="${id}"/>`);
  });

  it('catálogo: Enter num parágrafo com estilo — as duas metades mantêm o pPr, paraId não se repete', () => {
    if (!existsSync(CATALOG)) return;
    const { pkg, full } = open(CATALOG);
    const paras = paragraphsOf(full.blocks);
    const pi = paras.findIndex((p) => p.props.styleId && text(p).length > 10 && !p.props.sectionBreak);
    const style = paras[pi]!.props.styleId!;
    splitParagraph({ paragraphs: paras, sectPr: full.sections[0]!.sectPr }, { para: pi, offset: 4 });
    full.blocks.splice(full.blocks.findIndex((b) => b.type === 'paragraph' && b.paragraph === paras[pi]) + 1, 0, { type: 'paragraph', paragraph: paras[pi + 1]! });
    const xml = save(pkg, full).documentXml();
    const paraIds = [...xml.matchAll(/w14:paraId="([0-9A-F]+)"/g)].map((m) => m[1]);
    expect(new Set(paraIds).size).toBe(paraIds.length);
    const reread = paragraphsOf(readFullDocument(pkgFromXml(pkg, xml)).blocks);
    const k = reread.findIndex((p) => text(p) === text(paras[pi]!));
    expect(reread[k]!.props.styleId).toBe(style);
    expect(reread[k + 1]!.props.styleId).toBe(style);
  });

  it('catálogo: apagar um comentário tira os marcadores e só ele do comments.xml', () => {
    if (!existsSync(CATALOG)) return;
    const { pkg, full } = open(CATALOG);
    const gone = full.comments[0]!.id;
    const keep = full.comments[1]!.id;
    full.comments = full.comments.filter((c) => c.id !== gone);
    const strip = (ps: Paragraph[]) => { for (const p of ps) for (const r of p.runs) if (r.props.commentIds) r.props.commentIds = r.props.commentIds.filter((x) => x !== gone); };
    strip(paragraphsOf(full.blocks));
    for (const b of full.blocks) if (b.type === 'table') for (const row of b.rows) for (const c of row.cells) strip(c.paragraphs);
    const after = save(pkg, full);
    const xml = after.documentXml();
    expect(xml).not.toMatch(new RegExp(`commentRange(Start|End) w:id="${gone}"`));
    expect(xml).not.toMatch(new RegExp(`commentReference w:id="${gone}"`));
    expect(xml).toMatch(new RegExp(`commentRangeStart w:id="${keep}"`));
    const cx = after.getPartText('word/comments.xml')!;
    expect(cx).not.toMatch(new RegExp(`<w:comment [^>]*w:id="${gone}"`));
    expect(cx).toMatch(new RegExp(`<w:comment [^>]*w:id="${keep}"`));
  });

  it('catálogo: lista nova num documento com numbering.xml acrescenta, não substitui', () => {
    if (!existsSync(CATALOG)) return;
    const { pkg, full, original } = open(CATALOG);
    const before = DocxPackage.load(original).getPartText('word/numbering.xml')!;
    const paras = paragraphsOf(full.blocks);
    const pi = paras.findIndex((p) => !p.props.numbering && text(p).length > 5);
    applyParaProps({ paragraphs: paras, sectPr: full.sections[0]!.sectPr }, { start: { para: pi, offset: 0 }, end: { para: pi, offset: 0 } }, { numbering: { kind: 'decimal', ilvl: 0 } });
    const num = save(pkg, full).getPartText('word/numbering.xml')!;
    for (const m of before.matchAll(/<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"/g)) expect(num).toContain(`w:abstractNumId="${m[1]}"`);
    expect(num).toContain('w:abstractNumId="1002"');
    expect(num.indexOf('<w:num ')).toBeGreaterThan(num.lastIndexOf('<w:abstractNum '));
  });
});

function pkgFromXml(pkg: DocxPackage, xml: string): DocxPackage {
  const copy = DocxPackage.load(pkg.save());
  copy.setPartText('word/document.xml', xml);
  return copy;
}
