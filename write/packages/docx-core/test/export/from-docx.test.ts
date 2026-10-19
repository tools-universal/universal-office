import { describe, it, expect } from 'vitest';
import {
  DocxPackage,
  writeDocument,
  DEFAULT_RUN_PROPS,
  type DocumentModel,
  type RunProps,
  type Paragraph,
  type Block,
  type TableBlock,
} from '../../src/index.js';
import { docxToMarkdown, docxToHtml, exportDocFromFullDocument } from '../../src/export/from-docx.js';

const rp = (o: Partial<RunProps> = {}): RunProps => ({ ...DEFAULT_RUN_PROPS, ...o });
const para = (text: string, props: Paragraph['props'] = {}, rprops: Partial<RunProps> = {}): Paragraph => ({
  runs: text ? [{ text, props: rp(rprops) }] : [],
  props,
});

const sectPr = {
  pageWidthTwips: 11906, pageHeightTwips: 16838,
  marginLeftTwips: 1701, marginRightTwips: 1701,
  marginTopTwips: 1417, marginBottomTwips: 1417,
};

/** Gera bytes .docx reais a partir de parágrafos (e blocos opcionais). */
function docxBytes(paragraphs: Paragraph[], blocks?: Block[]): Uint8Array {
  const model: DocumentModel = { paragraphs, sectPr };
  const pkg = DocxPackage.empty();
  writeDocument(pkg, model, [], blocks ? { blocks } : {});
  return pkg.save();
}

describe('docxToMarkdown (bytes → md)', () => {
  it('parágrafos, título e ênfase', () => {
    const bytes = docxBytes([
      para('Meu Título', { styleId: 'Heading1' }),
      {
        runs: [
          { text: 'texto ', props: rp() },
          { text: 'forte', props: rp({ bold: true }) },
          { text: ' e ', props: rp() },
          { text: 'inclinado', props: rp({ italic: true }) },
        ],
        props: {},
      },
    ]);
    const md = docxToMarkdown(bytes);
    expect(md).toContain('# Meu Título');
    expect(md).toContain('**forte**');
    expect(md).toContain('*inclinado*');
  });

  it('listas com níveis', () => {
    const bytes = docxBytes([
      para('um', { numbering: { kind: 'bullet', ilvl: 0 } }),
      para('um.um', { numbering: { kind: 'bullet', ilvl: 1 } }),
      para('primeiro', { numbering: { kind: 'decimal', ilvl: 0 } }),
    ]);
    const md = docxToMarkdown(bytes);
    expect(md).toContain('- um');
    expect(md).toContain('  - um.um');
    expect(md).toContain('1. primeiro');
  });

  it('tabela na ordem correta (via blocks)', () => {
    const table: TableBlock = {
      type: 'table',
      gridColsTwips: [2000, 2000],
      rows: [
        { cells: [
          { paragraphs: [para('Col A')], tables: [], gridSpan: 1 },
          { paragraphs: [para('Col B')], tables: [], gridSpan: 1 },
        ] },
        { cells: [
          { paragraphs: [para('a1')], tables: [], gridSpan: 1 },
          { paragraphs: [para('b1')], tables: [], gridSpan: 1 },
        ] },
      ],
    };
    const pAntes = para('antes');
    const pDepois = para('depois');
    const bytes = docxBytes([pAntes, pDepois], [
      { type: 'paragraph', paragraph: pAntes },
      table,
      { type: 'paragraph', paragraph: pDepois },
    ]);
    const md = docxToMarkdown(bytes);
    expect(md).toContain('| Col A | Col B |');
    expect(md).toContain('| a1 | b1 |');
    expect(md.indexOf('antes')).toBeLessThan(md.indexOf('| Col A'));
    expect(md.indexOf('| a1')).toBeLessThan(md.indexOf('depois'));
  });

  it('documento vazio não explode', () => {
    const bytes = docxBytes([para('')]);
    expect(docxToMarkdown(bytes)).toBe('\n');
  });
});

describe('docxToHtml (bytes → html)', () => {
  it('heading e fullDocument', () => {
    const bytes = docxBytes([para('Cap', { styleId: 'Heading2' })]);
    const frag = docxToHtml(bytes, { fullDocument: false });
    expect(frag).toContain('<h2>Cap</h2>');
    const full = docxToHtml(bytes, { title: 'Doc' });
    expect(full.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(full).toContain('<title>Doc</title>');
  });
});

describe('exportDocFromFullDocument', () => {
  it('mapeia blocks → paragraphs + tableAnchors preservando ordem', () => {
    const p1 = para('p1');
    const p2 = para('p2');
    const t: TableBlock = { type: 'table', gridColsTwips: [], rows: [] };
    const doc = exportDocFromFullDocument({
      blocks: [{ type: 'paragraph', paragraph: p1 }, t, { type: 'paragraph', paragraph: p2 }],
      sections: [],
      footnotes: new Map(),
      endnotes: new Map(),
      comments: [],
      styles: new Map(),
      bookmarks: new Map(),
    });
    expect(doc.paragraphs).toEqual([p1, p2]);
    expect(doc.tableAnchors).toEqual([{ beforePara: 1, table: t }]);
  });
});
