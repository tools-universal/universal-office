import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  DocxPackage, readFullDocument, readDocument, writeDocument,
  insertText, serializeHfPart,
  type HfPartInfo, type DocumentModel, type Paragraph,
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

describe('estilos reais de styles.xml', () => {
  if (!existsSync(CATALOG)) { it.skip('catálogo ausente', () => {}); return; }
  const pkg = DocxPackage.load(new Uint8Array(readFileSync(CATALOG)));
  const doc = readFullDocument(pkg);

  it('Title do catálogo: styleId duplicado → ÚLTIMA definição vence (centro, 32pt, negrito)', () => {
    // o styles.xml do catálogo define Title 2× — o Word usa a última
    const title = doc.styles.get('Title')!;
    expect(title).toBeTruthy();
    expect(title.para.alignment).toBe('center');
    expect(title.run.szHalfPt).toBe(64);
    expect(title.run.bold).toBe(true);
    expect(title.run.color).toBe('1F3864');
  });

  it('Heading1 do catálogo (última definição): 17pt, cor 1F3864, negrito', () => {
    const h1 = doc.styles.get('Heading1')!;
    expect(h1.run.szHalfPt).toBe(34);
    expect(h1.run.color).toBe('1F3864');
    expect(h1.run.bold).toBe(true);
  });

  it('parágrafo "Catalogo de Recursos" usa pStyle Title sem jc direto', () => {
    const p = doc.blocks.find(
      (b) => b.type === 'paragraph' && b.paragraph.runs.some((r) => r.text.includes('Catalogo de Recursos')),
    );
    expect(p).toBeTruthy();
    if (p?.type === 'paragraph') {
      expect(p.paragraph.props.styleId).toBe('Title');
      expect(p.paragraph.props.alignment).toBeUndefined();
    }
  });
});

describe('quebra de página', () => {
  it('w:br type=page do catálogo vira \\f (não \\n)', () => {
    if (!existsSync(CATALOG)) return;
    const doc = readFullDocument(DocxPackage.load(new Uint8Array(readFileSync(CATALOG))));
    const text = doc.blocks.flatMap((b) => (b.type === 'paragraph' ? b.paragraph.runs : [])).map((r) => r.text).join('');
    expect(text).toContain('\f');
  });

  it('serializa \\f de volta como <w:br w:type="page"/> e relê', () => {
    const m = blankModel();
    insertText(m, { para: 0, offset: 0 }, 'antes\fdepois');
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    expect(pkg.documentXml()).toContain('<w:br w:type="page"/>');
    const re = readDocument(pkg);
    expect(re.paragraphs[0]!.runs.map((r) => r.text).join('')).toBe('antes\fdepois');
  });
});

describe('edição de cabeçalho/rodapé', () => {
  it('serializeHfPart gera w:hdr válido', () => {
    const paras: Paragraph[] = [{ runs: [{ text: 'Meu cabeçalho', props: { bold: true, italic: false, underline: false, strike: false, allCaps: false, smallCaps: false } }], props: { alignment: 'center' } }];
    const xml = serializeHfPart('header', paras);
    expect(xml).toContain('<w:hdr');
    expect(xml).toContain('Meu cabeçalho');
    expect(xml).toContain('<w:jc w:val="center"/>');
  });

  it('writeDocument com hfParts cria parte, rel, content-type e referência no sectPr', () => {
    const m = blankModel();
    insertText(m, { para: 0, offset: 0 }, 'corpo');
    const pkg = DocxPackage.empty();
    const hf: HfPartInfo[] = [{
      kind: 'header', type: 'default', rid: 'rIdWnheader', path: 'word/wn-header1.xml',
      paragraphs: [{ runs: [{ text: 'Cabeçalho editado', props: { bold: false, italic: false, underline: false, strike: false, allCaps: false, smallCaps: false } }], props: {} }],
      dirty: true,
    }];
    writeDocument(pkg, m, hf);
    expect(pkg.getPartText('word/wn-header1.xml')).toContain('Cabeçalho editado');
    expect(pkg.getPartText('word/_rels/document.xml.rels')).toContain('wn-header1.xml');
    expect(pkg.getPartText('[Content_Types].xml')).toContain('header+xml');
    expect(pkg.documentXml()).toContain('<w:headerReference w:type="default" r:id="rIdWnheader"/>');
  });

  it('round-trip: catálogo re-salvo PRESERVA os headers existentes (refs + partes)', () => {
    if (!existsSync(CATALOG)) return;
    const pkg = DocxPackage.load(new Uint8Array(readFileSync(CATALOG)));
    const doc = readFullDocument(pkg);
    const sec = doc.sections[0]!;
    expect(sec.headerRefs.length).toBeGreaterThanOrEqual(1);
    // edita o header default
    const hdr = sec.headers.default!;
    insertText({ paragraphs: hdr, sectPr: doc.sections[0]!.sectPr } as DocumentModel, { para: 0, offset: 0 }, 'EDITADO: ');
    const model = readDocument(pkg);
    const hfParts: HfPartInfo[] = sec.headerRefs.map((r) => ({
      kind: 'header', type: r.type, rid: r.rid, path: r.path,
      paragraphs: sec.headers[r.type]!, dirty: r.type === 'default',
    }));
    writeDocument(pkg, model, hfParts);
    const re = readFullDocument(DocxPackage.load(pkg.save()));
    const reHdr = re.sections[0]!.headers.default!;
    expect(reHdr.flatMap((p) => p.runs).map((r) => r.text).join('')).toContain('EDITADO: ');
  });
});
