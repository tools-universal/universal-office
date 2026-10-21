// Bordas de página (w:pgBorders) contra o ORÁCULO (write/tools/table-lab,
// pgbdr-*): o que o Word grava na Borda da Página e a gravação sem perdas.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument, writeDocument, type Block, type PageBorders, type SectPr } from '../src/index.js';

const RESULTS = join(__dirname, '../../../tools/table-lab/results');
const flat = (name: string): string => readFileSync(join(RESULTS, `${name}.xml`), 'utf8').replace(/\n\s*/g, '');
const pgb = (xml: string): string | undefined => /<w:pgBorders[\s\S]*?<\/w:pgBorders>/.exec(xml)?.[0];

const side = { val: 'single', sz: 4, space: 24, color: 'auto' };
const BOX: PageBorders = { offsetFrom: 'page', top: side, left: side, bottom: side, right: side };

function wordDoc(name: string) {
  const x = flat(name);
  const body = x.slice(x.indexOf('<w:body>'), x.indexOf('</w:body>') + 9);
  const pkg = DocxPackage.empty();
  pkg.setPartText('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + body + '</w:document>');
  const full = readFullDocument(pkg, { sources: true });
  full.sources!.baseline();
  const sectPr: SectPr = full.sections[0]!.sectPr;
  const save = (): string => {
    const paragraphs = full.blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);
    writeDocument(pkg, { paragraphs, sectPr }, [], { blocks: full.blocks, sources: full.sources });
    return pkg.documentXml();
  };
  return { sectPr, save };
}

describe('bordas de página', () => {
  it('lê o que o Word gravou', () => {
    expect(wordDoc('pgbdr-box').sectPr.pgBorders).toEqual(BOX);
    expect(wordDoc('pgbdr-first').sectPr.pgBorders?.display).toBe('firstPage');
    expect(wordDoc('pgbdr-back').sectPr.pgBorders?.zOrder).toBe('back');
    expect(wordDoc('pgbdr-shadow').sectPr.pgBorders?.top?.shadow).toBe(true);
  });
  it('documento novo: Caixa sai como o Word grava', () => {
    for (const [name, pb] of [
      ['pgbdr-box', BOX],
      ['pgbdr-first', { ...BOX, display: 'firstPage' }],
      ['pgbdr-back', { ...BOX, zOrder: 'back' }],
      ['pgbdr-shadow', { offsetFrom: 'page', ...Object.fromEntries((['top', 'left', 'bottom', 'right'] as const).map((s) => [s, { ...side, shadow: true }])) }],
      ['pgbdr-style', { offsetFrom: 'page', ...Object.fromEntries((['top', 'left', 'bottom', 'right'] as const).map((s) => [s, { val: 'double', sz: 18, space: 24, color: 'FF0000' }])) }],
    ] as [string, PageBorders][]) {
      const pkg = DocxPackage.empty();
      writeDocument(pkg, { paragraphs: [{ runs: [], props: {} }], sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417, pgBorders: pb } }, []);
      expect(pgb(pkg.documentXml())).toBe(pgb(flat(name)));
    }
  });
  it('sem perdas: intacta, trocada e removida', () => {
    const a = wordDoc('pgbdr-box');
    expect(pgb(a.save())).toBe(pgb(flat('pgbdr-box')));
    const b = wordDoc('pgbdr-box');
    b.sectPr.pgBorders = { ...BOX, display: 'firstPage' };
    expect(pgb(b.save())).toBe(pgb(flat('pgbdr-first')));
    const c = wordDoc('pgbdr-box');
    c.sectPr.pgBorders = null;
    expect(c.save()).not.toContain('w:pgBorders');
    // sem pgBorders no modelo (ausente): o cru fica
    const d = wordDoc('pgbdr-box');
    delete d.sectPr.pgBorders;
    expect(pgb(d.save())).toBe(pgb(flat('pgbdr-box')));
  });
});
