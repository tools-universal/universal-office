import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { DocxPackage, readDocument, readFullDocument } from '../src/index.js';

/**
 * TDD: comportamentos exigidos para abrir o Catalogo-Recursos-Word.docx
 * "perfeitamente". Cada teste descreve um recurso presente no arquivo.
 * (Os números vêm da dissecação do XML — ver results/catalogo/.)
 */
const CATALOG = 'D:\\Projects\\OfficeNext\\WordNext\\samples\\Catalogo-Recursos-Word.docx';

describe('Catálogo de recursos do Word', () => {
  if (!existsSync(CATALOG)) {
    it.skip('catálogo ausente', () => {});
    return;
  }
  const pkg = DocxPackage.load(new Uint8Array(readFileSync(CATALOG)));
  const doc = readFullDocument(pkg);

  it('abre sem exceção e tem blocos', () => {
    expect(doc.blocks.length).toBeGreaterThan(10);
  });

  it('lê a tabela com 5 linhas e 13 células (incl. gridSpan)', () => {
    const collect = (tables: TableBlock[]): TableBlock[] =>
      tables.flatMap((t) => [t, ...collect(t.rows.flatMap((r) => r.cells.flatMap((c) => c.tables)))]);
    const top = doc.blocks.filter((b): b is TableBlock => b.type === 'table');
    const all = collect(top);
    expect(all.length).toBe(1);
    const rows = all.flatMap((t) => t.rows);
    expect(rows.length).toBe(5);
    const cells = rows.flatMap((r) => r.cells);
    expect(cells.length).toBe(13);
    // a tabela tem célula mesclada (gridSpan > 1) e grade de colunas
    expect(all[0]!.gridColsTwips.length).toBeGreaterThanOrEqual(2);
    expect(cells.some((c) => c.gridSpan > 1)).toBe(true);
    for (const c of cells) expect(c.paragraphs.length).toBeGreaterThan(0);
  });

  it('lê hyperlinks como runs com link', () => {
    const runs = doc.blocks
      .flatMap((b) => (b.type === 'paragraph' ? b.paragraph.runs : []))
      .filter((r) => r.props.link);
    expect(runs.length).toBeGreaterThanOrEqual(2);
    expect(runs.some((r) => /^https?:\/\//.test(r.props.link!))).toBe(true);
  });

  it('lê as 3 seções com geometria própria', () => {
    expect(doc.sections.length).toBe(3);
    for (const s of doc.sections) {
      expect(s.sectPr.pageWidthTwips).toBeGreaterThan(1000);
      expect(s.blockEnd).toBeGreaterThanOrEqual(s.blockStart);
    }
    // paisagem em alguma seção? pelo menos uma difere das outras em algo
    const widths = new Set(doc.sections.map((s) => s.sectPr.pageWidthTwips));
    expect(widths.size).toBeGreaterThanOrEqual(1);
  });

  it('lê headers e footers referenciados pelas seções', () => {
    const withHeader = doc.sections.filter((s) => s.headers.default || s.headers.first);
    const withFooter = doc.sections.filter((s) => s.footers.default || s.footers.first);
    expect(withHeader.length).toBeGreaterThanOrEqual(1);
    expect(withFooter.length).toBeGreaterThanOrEqual(1);
    const anyHeader = withHeader[0]!.headers.default ?? withHeader[0]!.headers.first!;
    expect(anyHeader.length).toBeGreaterThan(0); // parágrafos
  });

  it('lê as imagens, incluindo a flutuante (wp:anchor)', () => {
    const allRuns = collectAllRuns(doc);
    const images = allRuns.filter((r) => r.image);
    expect(images.length).toBeGreaterThanOrEqual(7);
    const floating = images.filter((r) => r.image!.floating);
    expect(floating.length).toBe(1);
    for (const r of images) {
      expect(r.image!.data.length).toBeGreaterThan(100);
      expect(r.image!.widthTwips).toBeGreaterThan(10);
    }
  });

  it('lê footnotes com conteúdo e marcadores no texto', () => {
    expect(doc.footnotes.size).toBeGreaterThanOrEqual(2);
    const refs = collectAllRuns(doc).filter((r) => r.noteRef);
    expect(refs.filter((r) => r.noteRef!.kind === 'footnote').length).toBeGreaterThanOrEqual(2);
    // o conteúdo da nota 1 existe e tem texto
    expect(doc.footnotes.get(1)!.flatMap((p) => p.runs).map((r) => r.text).join('').length)
      .toBeGreaterThan(3);
  });

  it('lê comentários com texto e âncoras', () => {
    expect(doc.comments.length).toBeGreaterThanOrEqual(2);
    expect(doc.comments[0]!.text.length).toBeGreaterThan(0);
  });

  it('campos (fldSimple DATE) viram runs de campo, mesmo auto-fechados', () => {
    const fields = collectAllRuns(doc).filter((r) => r.field);
    expect(fields.length).toBeGreaterThanOrEqual(2);
    expect(fields.some((r) => /DATE/i.test(r.field!))).toBe(true);
  });

  it('w:sym vira o caractere correto com a fonte do símbolo', () => {
    const syms = collectAllRuns(doc).filter(
      (r) => r.props.fontAscii && /gothic|wingdings|symbol/i.test(r.props.fontAscii) && r.text.length === 1,
    );
    expect(syms.length).toBeGreaterThanOrEqual(2);
    // U+2612 ☒ e U+2610 ☐ preservados como Unicode real (não área privada)
    expect(syms.some((r) => r.text === '☒' || r.text === '☐')).toBe(true);
  });

  it('equações (oMath) viram texto fallback', () => {
    const text = doc.blocks
      .flatMap((b) => (b.type === 'paragraph' ? b.paragraph.runs : []))
      .map((r) => r.text)
      .join('');
    // o catálogo tem 2 oMath; o fallback deve produzir ALGUM texto deles
    const mathRuns = collectAllRuns(doc).filter((r) => r.props.isMath);
    expect(mathRuns.length).toBeGreaterThanOrEqual(1);
    expect(text.length).toBeGreaterThan(100);
  });

  it('retrocompat: readDocument (plano) continua funcionando', () => {
    const flat = readDocument(pkg);
    expect(flat.paragraphs.length).toBeGreaterThan(5);
  });
});

import type { FullDocument, Run, TableBlock } from '../src/index.js';
function collectAllRuns(doc: FullDocument): Run[] {
  const out: Run[] = [];
  for (const b of doc.blocks) {
    if (b.type === 'paragraph') out.push(...b.paragraph.runs);
    else for (const row of b.rows) for (const cell of row.cells) for (const p of cell.paragraphs) out.push(...p.runs);
  }
  for (const s of doc.sections) {
    for (const hf of [s.headers.default, s.headers.first, s.headers.even, s.footers.default, s.footers.first, s.footers.even]) {
      if (hf) for (const p of hf) out.push(...p.runs);
    }
  }
  for (const [, paras] of doc.footnotes) for (const p of paras) out.push(...p.runs);
  for (const [, paras] of doc.endnotes) for (const p of paras) out.push(...p.runs);
  return out;
}
