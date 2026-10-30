import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  DocxPackage, readFullDocument, writeDocument, markSectionBreaks, splitParagraph, DEFAULT_RUN_PROPS,
  type FullDocument, type Paragraph, type Block,
} from '../src/index.js';

// Controle de conteúdo de BLOCO com docPartObj (sumário, folha de rosto) no modelo
// do editor: a marca ParaProps.blockSdt, o Enter que fica dentro e o controle novo
// embrulhado ao salvar (frente Sumário — write/tools/toc-lab, bb-*).
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
function docx(body: string): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    'word/document.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`),
  });
}
const SDT = '<w:sdt><w:sdtPr><w:id w:val="-1864665924"/><w:docPartObj><w:docPartGallery w:val="Table of Contents"/><w:docPartUnique/></w:docPartObj></w:sdtPr><w:sdtContent>'
  + '<w:p><w:pPr><w:pStyle w:val="CabealhodoSumrio"/></w:pPr><w:r><w:t>Sumário</w:t></w:r></w:p>'
  + '<w:p><w:r><w:t>Entrada</w:t></w:r></w:p>'
  + '</w:sdtContent></w:sdt>';
const BODY = '<w:p><w:r><w:t>Antes</w:t></w:r></w:p>' + SDT + '<w:p><w:r><w:t>Depois</w:t></w:r></w:p>';

const paragraphsOf = (blocks: Block[]): Paragraph[] =>
  blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);
function open(body = BODY, sources = true): { pkg: DocxPackage; full: FullDocument; ps: Paragraph[] } {
  const pkg = DocxPackage.load(docx(body));
  const full = readFullDocument(pkg, { sources });
  markSectionBreaks(full);
  full.sources?.baseline();
  return { pkg, full, ps: paragraphsOf(full.blocks) };
}
function save(pkg: DocxPackage, full: FullDocument, blocks = full.blocks): string {
  const last = full.sections[full.sections.length - 1]!;
  writeDocument(pkg, { paragraphs: paragraphsOf(blocks), sectPr: last.sectPr }, [], { blocks, sources: full.sources });
  const x = DocxPackage.load(pkg.save()).documentXml();
  return x.slice(x.indexOf('<w:body>'), x.indexOf('<w:sectPr'));
}

describe('controle de conteúdo de bloco (docPartObj)', () => {
  it('leitura com fontes: a marca nos parágrafos do controle (galeria e key); fora dele, nada', () => {
    const { ps } = open();
    expect(ps.map((p) => p.props.blockSdt?.gallery)).toEqual([undefined, 'Table of Contents', 'Table of Contents', undefined]);
    expect(ps[1]!.props.blockSdt!.key).toBe(ps[2]!.props.blockSdt!.key);
    expect(ps[1]!.props.blockSdt!.pr).toBeUndefined();
  });

  it('sem fontes (viewer, motor de layout, .NET): a marca com a galeria também (NUMPAGES com folha de rosto)', () => {
    const { ps } = open(BODY, false);
    expect(ps.map((p) => p.props.blockSdt?.gallery)).toEqual([undefined, 'Table of Contents', 'Table of Contents', undefined]);
    expect(ps[1]!.props.blockSdt!.pr).toBeUndefined();
  });

  it('sem edição: byte a byte', () => {
    const { pkg, full } = open();
    expect(save(pkg, full)).toBe(`<w:body>${BODY}`);
  });

  it('Enter no último parágrafo do controle: o novo fica dentro dele', () => {
    const { pkg, full, ps } = open();
    splitParagraph({ paragraphs: ps, sectPr: full.sections[0]!.sectPr }, { para: 2, offset: 7 });
    ps[3]!.runs = [{ text: 'Nova', props: { ...DEFAULT_RUN_PROPS } }];
    const blocks: Block[] = ps.map((paragraph) => ({ type: 'paragraph', paragraph }));
    const x = save(pkg, full, blocks);
    expect(x).toContain('<w:t>Entrada</w:t></w:r></w:p><w:p><w:r><w:t>Nova</w:t></w:r></w:p></w:sdtContent></w:sdt><w:p><w:r><w:t>Depois</w:t>');
  });

  it('controle NOVO (marca com o w:sdtPr): os parágrafos seguidos com a mesma key num w:sdt', () => {
    const { pkg, full, ps } = open('<w:p><w:r><w:t>Antes</w:t></w:r></w:p><w:p><w:r><w:t>Depois</w:t></w:r></w:p>');
    const sdt = { key: 'n1', gallery: 'Table of Contents', pr: '<w:sdtPr><w:id w:val="7"/><w:docPartObj><w:docPartGallery w:val="Table of Contents"/><w:docPartUnique/></w:docPartObj></w:sdtPr>' };
    const novo = (t: string): Paragraph => ({ runs: [{ text: t, props: { ...DEFAULT_RUN_PROPS } }], props: { blockSdt: sdt } });
    ps.splice(1, 0, novo('Sumário'), novo('Entrada'));
    const x = save(pkg, full, ps.map((paragraph) => ({ type: 'paragraph', paragraph })));
    expect(x).toBe('<w:body><w:p><w:r><w:t>Antes</w:t></w:r></w:p><w:sdt>' + sdt.pr + '<w:sdtContent><w:p><w:r><w:t>Sumário</w:t></w:r></w:p><w:p><w:r><w:t>Entrada</w:t></w:r></w:p></w:sdtContent></w:sdt><w:p><w:r><w:t>Depois</w:t></w:r></w:p>');
  });

  it('nível de tópico direto (Adicionar Texto): w:outlineLvl lido e gravado', () => {
    const { pkg, full, ps } = open('<w:p><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:r><w:t>Dois</w:t></w:r></w:p><w:p><w:r><w:t>Corpo</w:t></w:r></w:p>');
    expect(ps[0]!.props.outlineLvl).toBe(1);
    ps[0]!.props = { ...ps[0]!.props, outlineLvl: 9 };
    ps[1]!.props = { ...ps[1]!.props, outlineLvl: 0 };
    expect(save(pkg, full)).toBe('<w:body><w:p><w:pPr><w:outlineLvl w:val="9"/></w:pPr><w:r><w:t>Dois</w:t></w:r></w:p><w:p><w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:r><w:t>Corpo</w:t></w:r></w:p>');
  });
});
