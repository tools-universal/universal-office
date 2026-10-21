// Objeto OLE incorporado (Planilha do Excel): gravação como o Word (w:object
// com a prévia VML e o pacote em word/embeddings) e leitura de volta.
import { describe, expect, it } from 'vitest';
import { DocxPackage, readFullDocument, writeDocument, type Block, type Run } from '../src/index.js';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const XLSX = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 9, 9, 9]);

describe('objeto OLE (Planilha do Excel)', () => {
  it('grava w:object + o:OLEObject + partes e relações; lê de volta', () => {
    const pkg = DocxPackage.empty();
    const run: Run = {
      text: '￼', props: {},
      image: { data: PNG, ext: 'png', widthTwips: 4320, heightTwips: 1440, ole: { progId: 'Excel.Sheet.12', data: XLSX, ext: 'xlsx' } },
    };
    writeDocument(pkg, { paragraphs: [{ runs: [run], props: {} }], sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 } }, []);
    const xml = pkg.documentXml();
    expect(xml).toMatch(/<w:object [^>]*w:dxaOrig="4320" w:dyaOrig="1440">/);
    expect(xml).toContain('style="width:216pt;height:72pt"');
    expect(xml).toMatch(/<o:OLEObject Type="Embed" ProgID="Excel.Sheet.12" ShapeID="_x0000_i\d+" DrawAspect="Content" ObjectID="_\d+" r:id="rIdWnOle\d+"\/>/);
    const rels = pkg.getPartText('word/_rels/document.xml.rels')!;
    expect(rels).toMatch(/Type="http:\/\/schemas.openxmlformats.org\/officeDocument\/2006\/relationships\/package" Target="embeddings\/wnobject\d+\.xlsx"/);
    expect(pkg.getPartText('[Content_Types].xml')).toContain('<Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>');
    const back = DocxPackage.load(pkg.save());
    const full = readFullDocument(back);
    const p = full.blocks.find((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph')!;
    const img = p.paragraph.runs.find((r) => r.image)?.image;
    expect(img?.ole?.progId).toBe('Excel.Sheet.12');
    expect([...img!.ole!.data]).toEqual([...XLSX]);
    expect(img?.widthTwips).toBe(4320);
  });
});
