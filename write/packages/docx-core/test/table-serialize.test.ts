import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  DocxPackage, readFullDocument, writeDocument, readDocument,
  type Block, type DocumentModel,
} from '../src/index.js';

const CATALOG = 'D:\\Projects\\OfficeNext\\WordNext\\samples\\Catalogo-Recursos-Word.docx';

describe('serialização de tabelas', () => {
  if (!existsSync(CATALOG)) { it.skip('catálogo ausente', () => {}); return; }

  it('round-trip da tabela do catálogo via blocks preserva linhas/células/bordas', () => {
    const pkg = DocxPackage.load(new Uint8Array(readFileSync(CATALOG)));
    const doc = readFullDocument(pkg);
    const origTable = doc.blocks.find((b) => b.type === 'table');
    expect(origTable).toBeTruthy();

    const model: DocumentModel = readDocument(pkg);
    writeDocument(pkg, model, [], { blocks: doc.blocks as Block[] });
    const bytes = pkg.save();

    const re = readFullDocument(DocxPackage.load(bytes));
    const reTable = re.blocks.find((b) => b.type === 'table');
    expect(reTable).toBeTruthy();
    if (origTable?.type !== 'table' || reTable?.type !== 'table') return;
    expect(reTable.rows.length).toBe(origTable.rows.length);
    expect(reTable.rows.flatMap((r) => r.cells).length).toBe(origTable.rows.flatMap((r) => r.cells).length);
    // bordas e gridSpan preservados
    expect(reTable.borders?.insideH?.style).toBe(origTable.borders?.insideH?.style);
    expect(reTable.rows.flatMap((r) => r.cells).some((c) => c.gridSpan > 1)).toBe(true);
    // cabeçalho em negrito preservado
    const headerRun = reTable.rows[0]!.cells[0]!.paragraphs.flatMap((p) => p.runs).find((r) => r.props.bold);
    expect(headerRun).toBeTruthy();
  });

  it('tabela simples 2x2 serializa w:tbl/w:tr/w:tc', () => {
    const t: Block = {
      type: 'table',
      gridColsTwips: [2000, 2000],
      borders: { top: { style: 'single', sizeEighthPt: 4, spacePt: 0 }, insideH: { style: 'single', sizeEighthPt: 4, spacePt: 0 }, insideV: { style: 'single', sizeEighthPt: 4, spacePt: 0 } },
      rows: [0, 1].map(() => ({
        cells: [0, 1].map(() => ({
          paragraphs: [{ runs: [{ text: 'célula', props: {} as never }], props: {} }],
          tables: [], gridSpan: 1,
        })),
      })),
    };
    const pkg = DocxPackage.empty();
    const model: DocumentModel = {
      paragraphs: [{ runs: [], props: {} }],
      sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 },
    };
    writeDocument(pkg, model, [], { blocks: [t, { type: 'paragraph', paragraph: { runs: [], props: {} } }] });
    const xml = pkg.documentXml();
    expect(xml).toContain('<w:tbl>');
    expect((xml.match(/<w:tr>/g) ?? []).length).toBe(2);
    expect((xml.match(/<w:tc>/g) ?? []).length).toBe(4);
    expect(xml).toContain('<w:tblBorders>');
  });
});
