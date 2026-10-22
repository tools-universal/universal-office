import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  DocxPackage, readFullDocument, writeDocument, markSectionBreaks, insertText, deleteRange, splitParagraph, insertIndex,
  type FullDocument, type Paragraph, type Block, type Run,
} from '../src/index.js';

// Indicadores e campos que atravessam parágrafos no modelo do editor (marcas de
// largura zero) — regras do Word medidas em write/tools/refs-lab (bm-*, tof-*).
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
function docx(body: string): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    'word/document.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`),
  });
}
const BODY = '<w:p><w:r><w:t xml:space="preserve">Alfa </w:t></w:r><w:bookmarkStart w:id="0" w:name="marca"/><w:r><w:t>beta</w:t></w:r><w:bookmarkEnd w:id="0"/><w:r><w:t xml:space="preserve"> gama.</w:t></w:r></w:p>'
  + '<w:p><w:r><w:t>Fim.</w:t></w:r></w:p>';

function open(body = BODY): { pkg: DocxPackage; full: FullDocument; ps: Paragraph[] } {
  const pkg = DocxPackage.load(docx(body));
  const full = readFullDocument(pkg, { sources: true });
  markSectionBreaks(full);
  full.sources!.baseline();
  return { pkg, full, ps: paragraphsOf(full.blocks) };
}
const paragraphsOf = (blocks: Block[]): Paragraph[] =>
  blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);
function save(pkg: DocxPackage, full: FullDocument): string {
  const last = full.sections[full.sections.length - 1]!;
  writeDocument(pkg, { paragraphs: paragraphsOf(full.blocks), sectPr: last.sectPr }, [], { blocks: full.blocks, sources: full.sources });
  return body(DocxPackage.load(pkg.save()).documentXml());
}
/** Só o w:body (o gravador acrescenta namespaces na raiz). */
const body = (xml: string): string => xml.slice(xml.indexOf('<w:body>'));
/** Texto do parágrafo com as marcas visíveis: [nome … ]nome. */
const show = (p: Paragraph): string => p.runs.map((r: Run) => (r.bookmark ? (r.bookmark.end ? `]${r.bookmark.name}` : `[${r.bookmark.name}`) : r.text)).join('');

describe('indicadores no modelo do editor', () => {
  it('leitura com fontes: marcas de largura zero; salvar sem editar devolve o XML', () => {
    const { pkg, full, ps } = open();
    expect(show(ps[0]!)).toBe('Alfa [marcabeta]marca gama.');
    expect(ps[0]!.runs.map((r) => r.text).join('')).toBe('Alfa beta gama.');
    expect(full.bookmarkEnds?.get('marca')).toEqual({ block: 0, offset: 9 });
    expect(save(pkg, full)).toBe(body(DocxPackage.load(docx(BODY)).documentXml()));
  });

  it('sem fontes (viewer, .NET) não há marcas nos runs', () => {
    const full = readFullDocument(DocxPackage.load(docx(BODY)));
    expect(paragraphsOf(full.blocks)[0]!.runs.some((r) => r.bookmark)).toBe(false);
    expect(full.bookmarks.get('marca')).toBe(0);
  });

  it('digitar: no começo entra, no fim fica fora (bm-type-start/end)', () => {
    const a = open();
    insertText({ paragraphs: a.ps, sectPr: a.full.sections[0]!.sectPr }, { para: 0, offset: 5 }, 'XY');
    expect(show(a.ps[0]!)).toBe('Alfa [marcaXYbeta]marca gama.');
    const b = open();
    insertText({ paragraphs: b.ps, sectPr: b.full.sections[0]!.sectPr }, { para: 0, offset: 9 }, 'XY');
    expect(show(b.ps[0]!)).toBe('Alfa [marcabeta]marcaXY gama.');
  });

  it('apagar: o trecho inteiro some com o indicador; parte encolhe (bm-del-*)', () => {
    const a = open();
    deleteRange({ paragraphs: a.ps, sectPr: a.full.sections[0]!.sectPr }, { start: { para: 0, offset: 5 }, end: { para: 0, offset: 9 } });
    expect(show(a.ps[0]!)).toBe('Alfa  gama.');
    const b = open();
    deleteRange({ paragraphs: b.ps, sectPr: b.full.sections[0]!.sectPr }, { start: { para: 0, offset: 3 }, end: { para: 0, offset: 7 } });
    expect(show(b.ps[0]!)).toBe('Alf[marcata]marca gama.');
    const c = open();
    deleteRange({ paragraphs: c.ps, sectPr: c.full.sections[0]!.sectPr }, { start: { para: 0, offset: 4 }, end: { para: 0, offset: 9 } });
    expect(show(c.ps[0]!)).toBe('Alfa gama.');
  });

  it('indicador de ponto: some só estritamente dentro do trecho apagado', () => {
    const body = '<w:p><w:r><w:t xml:space="preserve">Alfa </w:t></w:r><w:bookmarkStart w:id="0" w:name="p"/><w:bookmarkEnd w:id="0"/><w:r><w:t>beta gama.</w:t></w:r></w:p>';
    const a = open(body);
    deleteRange({ paragraphs: a.ps, sectPr: a.full.sections[0]!.sectPr }, { start: { para: 0, offset: 4 }, end: { para: 0, offset: 5 } });
    expect(show(a.ps[0]!)).toBe('Alfa[p]pbeta gama.');
    const b = open(body);
    deleteRange({ paragraphs: b.ps, sectPr: b.full.sections[0]!.sectPr }, { start: { para: 0, offset: 3 }, end: { para: 0, offset: 7 } });
    expect(show(b.ps[0]!)).toBe('Alfta gama.');
  });

  it('Enter no começo do indicador: a marca fica no 1º parágrafo (bm-enter-start)', () => {
    const a = open();
    splitParagraph({ paragraphs: a.ps, sectPr: a.full.sections[0]!.sectPr }, { para: 0, offset: 5 });
    expect(show(a.ps[0]!)).toBe('Alfa [marca');
    expect(show(a.ps[1]!)).toBe('beta]marca gama.');
    expect(insertIndex(a.ps[1]!, 4)).toBe(2);
  });

  it('indicador novo grava bookmarkStart/End com o id', () => {
    const { pkg, full, ps } = open();
    const p = ps[1]!;
    p.runs.splice(0, 0, { text: '', props: { ...p.runs[0]!.props }, bookmark: { id: 5, name: 'novo' } });
    p.runs.push({ text: '', props: { ...p.runs[0]!.props }, bookmark: { id: 5, name: 'novo', end: true } });
    expect(save(pkg, full)).toContain('<w:p><w:bookmarkStart w:id="5" w:name="novo"/><w:r><w:t>Fim.</w:t></w:r><w:bookmarkEnd w:id="5"/></w:p>');
  });
});

describe('campo que atravessa parágrafos (sumário)', () => {
  const TOC = '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\h \\z \\c "Figura" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Figura 1</w:t></w:r></w:p>'
    + '<w:p><w:r><w:t>Figura 2</w:t></w:r></w:p>'
    + '<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t>Corpo.</w:t></w:r></w:p>';

  it('o começo vira run fieldOpen e o fim, marca fieldEnd; salvar sem editar devolve o XML', () => {
    const { pkg, full, ps } = open(TOC);
    expect(ps[0]!.runs[0]).toMatchObject({ field: ' TOC \\h \\z \\c "Figura" ', fieldOpen: true, text: 'Figura 1' });
    expect(ps[2]!.runs[0]).toMatchObject({ text: '', fieldEnd: true });
    expect(save(pkg, full)).toBe(body(DocxPackage.load(docx(TOC)).documentXml()));
  });

  it('apagar o texto do fim do campo sem o começo mantém o fim (o campo não fica aberto)', () => {
    const { full, ps } = open(TOC);
    deleteRange({ paragraphs: ps, sectPr: full.sections[0]!.sectPr }, { start: { para: 1, offset: 4 }, end: { para: 2, offset: 3 } });
    expect(ps[1]!.runs.some((r) => r.fieldEnd)).toBe(true);
  });

  it('sumário em sdt: parágrafos novos entre os do envoltório ficam dentro dele', () => {
    const SDT = `<w:sdt><w:sdtPr><w:docPartObj><w:docPartGallery w:val="Table of Contents"/></w:docPartObj></w:sdtPr><w:sdtContent>${TOC}</w:sdtContent></w:sdt><w:p><w:r><w:t>Depois.</w:t></w:r></w:p>`;
    const { pkg, full, ps } = open(SDT);
    const entry: Paragraph = { props: {}, runs: [{ text: 'Figura 3', props: { ...ps[1]!.runs[0]!.props, src: undefined } }] };
    full.blocks.splice(2, 0, { type: 'paragraph', paragraph: entry });
    const xml = save(pkg, full);
    const content = xml.slice(xml.indexOf('<w:sdtContent>'), xml.indexOf('</w:sdtContent>'));
    expect(content).toContain('Figura 3');
    expect(content).toContain('w:fldCharType="end"');
    expect(xml.slice(xml.indexOf('</w:sdtContent>'))).toContain('Depois.');
  });

  it('marcas novas: começo (instrução) e fim como o Word grava', () => {
    const { pkg, full, ps } = open('<w:p><w:r><w:t>Antes</w:t></w:r></w:p>');
    const p = ps[0]!;
    p.runs.push({ text: '', props: { ...p.runs[0]!.props }, fieldBegin: ' TOC \\c "Figura" ' });
    p.runs.push({ text: '', props: { ...p.runs[0]!.props }, fieldEnd: true });
    expect(save(pkg, full)).toContain('<w:r><w:t>Antes</w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\c "Figura" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>');
  });
});
