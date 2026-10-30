import { describe, expect, it } from 'vitest';
import {
  DocxPackage, readFullDocument, writeDocument, markSectionBreaks, insertText, applyRunProps,
  type FullDocument, type Paragraph, type Block, type HfPartInfo,
} from '../src/index.js';

// Campo com campo aninhado no código ({ = { NUMPAGES } - 1 }, o "total sem a capa"):
// o modelo guarda o código com as chaves (Run.fieldCode) e a gravação não perde o
// campo aninhado — nem com o rodapé editado.

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
  + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const fld = (instr: string, cached: string, inner = ''): string =>
  `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r>${inner}`
  + `<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>${cached}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const FORMULA = '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> = </w:instrText></w:r>'
  + fld('NUMPAGES \\* Arabic \\* MERGEFORMAT', '4')
  + '<w:r><w:instrText xml:space="preserve"> - 1 </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>'
  + '<w:r><w:t>3</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
const FOOTER = `<w:p><w:r><w:t xml:space="preserve">Página </w:t></w:r>${fld('PAGE', '1')}<w:r><w:t xml:space="preserve"> de </w:t></w:r>${FORMULA}</w:p>`;

function make(): DocxPackage {
  const pkg = DocxPackage.empty();
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body><w:p><w:r><w:t>corpo</w:t></w:r></w:p>`
    + '<w:sectPr><w:footerReference w:type="default" r:id="rIdF"/><w:pgNumType w:start="0"/><w:titlePg/></w:sectPr></w:body></w:document>');
  pkg.setPartText('word/footer1.xml', `<?xml version="1.0"?><w:ftr ${NS}>${FOOTER}</w:ftr>`);
  pkg.setPartText('word/_rels/document.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rIdF" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>');
  return pkg;
}

function open(pkg: DocxPackage): FullDocument {
  const full = readFullDocument(pkg, { sources: true });
  markSectionBreaks(full);
  full.sources!.baseline();
  return full;
}

const paras = (blocks: Block[]): Paragraph[] =>
  blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);

/** Grava como o editor, com o rodapé sujo. */
function save(pkg: DocxPackage, full: FullDocument): string {
  const s = full.sections[0]!;
  const hfParts: HfPartInfo[] = s.footerRefs.map((r) => ({ kind: 'footer', type: r.type, rid: r.rid, path: r.path, paragraphs: s.footers[r.type]!, dirty: true }));
  writeDocument(pkg, { paragraphs: paras(full.blocks), sectPr: s.sectPr }, hfParts, {
    bodySectRefs: hfParts.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid })),
    blocks: full.blocks,
    sources: full.sources,
  });
  return DocxPackage.load(pkg.save()).getPartText('word/footer1.xml')!;
}

const formulaRun = (full: FullDocument) => full.sections[0]!.footers.default![0]!.runs.find((r) => r.field?.trim().startsWith('='))!;

describe('campo aninhado no código (Run.fieldCode)', () => {
  it('a leitura guarda o código com o campo aninhado entre chaves', () => {
    const full = readFullDocument(make());
    const run = formulaRun(full);
    expect(run.field).toBe(' = 4 - 1 ');
    expect(run.fieldCode).toBe(' = { NUMPAGES \\* Arabic \\* MERGEFORMAT } - 1 ');
    expect(run.text).toBe('3');
    // campo sem aninhado não ganha fieldCode
    expect(full.sections[0]!.footers.default![0]!.runs.find((r) => r.field?.trim() === 'PAGE')!.fieldCode).toBeUndefined();
  });

  it('dois níveis: { = { = { NUMPAGES } - 1 } * 2 }', () => {
    const pkg = make();
    const inner = '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> = </w:instrText></w:r>'
      + fld('NUMPAGES', '4') + '<w:r><w:instrText xml:space="preserve"> - 1 </w:instrText></w:r>'
      + '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>3</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
    const outer = '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> = </w:instrText></w:r>' + inner
      + '<w:r><w:instrText xml:space="preserve"> * 2 </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>'
      + '<w:r><w:t>6</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
    pkg.setPartText('word/footer1.xml', `<?xml version="1.0"?><w:ftr ${NS}><w:p>${outer}</w:p></w:ftr>`);
    const run = formulaRun(readFullDocument(pkg));
    expect(run.fieldCode).toBe(' = { = { NUMPAGES } - 1 } * 2 ');
  });

  it('rodapé editado fora do campo: o campo aninhado volta intacto', () => {
    const pkg = make();
    const full = open(pkg);
    const footer = full.sections[0]!.footers.default!;
    insertText({ paragraphs: footer, sectPr: full.sections[0]!.sectPr }, { para: 0, offset: 0 }, 'Doc — ');
    const xml = save(pkg, full);
    expect(xml).toContain('Doc — ');
    expect(xml).toMatch(/<w:instrText[^>]*> = <\/w:instrText>[\s\S]*NUMPAGES[\s\S]*- 1 [\s\S]*fldCharType="end"/);
    const again = formulaRun(readFullDocument(DocxPackage.load(pkg.save())));
    expect(again.fieldCode).toBe(' = { NUMPAGES \\* Arabic \\* MERGEFORMAT } - 1 ');
  });

  it('o próprio campo reformatado (negrito): a fórmula volta com o campo aninhado', () => {
    const pkg = make();
    const full = open(pkg);
    const footer = full.sections[0]!.footers.default!;
    const len = footer[0]!.runs.reduce((n, r) => n + r.text.length, 0);
    applyRunProps({ paragraphs: footer, sectPr: full.sections[0]!.sectPr }, { start: { para: 0, offset: 0 }, end: { para: 0, offset: len } }, { bold: true });
    const xml = save(pkg, full);
    expect(xml).toContain('<w:b/>');
    const again = formulaRun(readFullDocument(DocxPackage.load(pkg.save())));
    expect(again.fieldCode?.replace(/\s+/g, ' ')).toBe(' = { NUMPAGES \\* Arabic \\* MERGEFORMAT } - 1 ');
    expect(again.text).toBe('3');
  });
});
