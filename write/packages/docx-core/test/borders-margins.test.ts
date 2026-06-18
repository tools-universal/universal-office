import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  DocxPackage, readFullDocument, readDocument, writeDocument, insertText,
  type DocumentModel, type TableBlock,
} from '../src/index.js';

const CATALOG = 'D:\\Projects\\OfficeNext\\WordNext\\samples\\Catalogo-Recursos-Word.docx';

const blankModel = (): DocumentModel => ({
  paragraphs: [{ runs: [], props: {} }],
  sectPr: {
    pageWidthTwips: 11906, pageHeightTwips: 16838,
    marginLeftTwips: 1701, marginRightTwips: 1701,
    marginTopTwips: 1417, marginBottomTwips: 1417,
  },
});

describe('bordas de parágrafo (pBdr por lado)', () => {
  if (!existsSync(CATALOG)) { it.skip('catálogo ausente', () => {}); return; }
  const doc = readFullDocument(DocxPackage.load(new Uint8Array(readFileSync(CATALOG))));

  it('lê o pBdr dourado do catálogo com cor, espessura e espaçamento', () => {
    const p = doc.blocks.find(
      (b) => b.type === 'paragraph' && b.paragraph.props.borders?.top,
    );
    expect(p).toBeTruthy();
    if (p?.type !== 'paragraph') return;
    const b = p.paragraph.props.borders!;
    for (const side of ['top', 'left', 'bottom', 'right'] as const) {
      expect(b[side]?.style).toBe('single');
      expect(b[side]?.color).toBe('BF9000');
      expect(b[side]?.sizeEighthPt).toBe(8); // 1pt
      expect(b[side]?.spacePt).toBe(6);
    }
  });

  it('serializa bordas por lado e relê igual', () => {
    const m = blankModel();
    insertText(m, { para: 0, offset: 0 }, 'com borda');
    m.paragraphs[0]!.props.borders = {
      top: { style: 'single', sizeEighthPt: 8, color: 'BF9000', spacePt: 6 },
      bottom: { style: 'single', sizeEighthPt: 16, color: 'FF0000', spacePt: 2 },
    };
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    expect(pkg.documentXml()).toContain('w:pBdr');
    const re = readDocument(pkg);
    const b = re.paragraphs[0]!.props.borders!;
    expect(b.top?.color).toBe('BF9000');
    expect(b.bottom?.sizeEighthPt).toBe(16);
    expect(b.bottom?.color).toBe('FF0000');
    expect(b.left).toBeUndefined();
  });
});

describe('bordas de tabela (tblBorders + tcBorders)', () => {
  if (!existsSync(CATALOG)) { it.skip('catálogo ausente', () => {}); return; }
  const doc = readFullDocument(DocxPackage.load(new Uint8Array(readFileSync(CATALOG))));
  const table = doc.blocks.find((b): b is TableBlock => b.type === 'table')!;

  it('lê tblBorders do catálogo (single sz=4 nas 6 posições)', () => {
    expect(table.borders).toBeTruthy();
    for (const side of ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const) {
      expect(table.borders![side]?.style, side).toBe('single');
      expect(table.borders![side]?.sizeEighthPt, side).toBe(4);
    }
  });

  it('lê tcBorders por célula (o catálogo tem 13)', () => {
    const cellsWithBorders = table.rows.flatMap((r) => r.cells).filter((c) => c.borders);
    expect(cellsWithBorders.length).toBe(13);
  });
});

describe('margens', () => {
  it('margens custom serializam e releem', () => {
    const m = blankModel();
    m.sectPr.marginLeftTwips = 720;
    m.sectPr.marginRightTwips = 2880;
    m.sectPr.marginTopTwips = 567;
    m.sectPr.marginBottomTwips = 1134;
    insertText(m, { para: 0, offset: 0 }, 'x');
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    const re = readDocument(pkg);
    expect(re.sectPr.marginLeftTwips).toBe(720);
    expect(re.sectPr.marginRightTwips).toBe(2880);
    expect(re.sectPr.marginTopTwips).toBe(567);
    expect(re.sectPr.marginBottomTwips).toBe(1134);
  });
});
